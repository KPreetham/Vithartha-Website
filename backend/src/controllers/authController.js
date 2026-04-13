import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

const generateGoogleSignupToken = ({ email, name, googleId }) => {
  return jwt.sign(
    {
      email,
      name,
      googleId,
      purpose: "google-signup",
    },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "10m" },
  );
};

const getGoogleProfileFromAccessToken = async (accessToken) => {
  const response = await axios.get(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 10000,
    },
  );

  return response.data;
};

const getGoogleTokenInfo = async (accessToken) => {
  const response = await axios.get(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`,
    {
      timeout: 10000,
    },
  );

  return response.data;
};

export const registerUser = async (req, res) => {
  const { name, email, password, company, googleSignupToken } = req.body;

  try {
    let normalizedEmail = String(email || "").trim().toLowerCase();
    let normalizedName = String(name || "").trim();
    let googleIdFromToken;

    if (googleSignupToken) {
      let decoded;
      try {
        decoded = jwt.verify(
          googleSignupToken,
          process.env.JWT_SECRET || "fallback_secret",
        );
      } catch (tokenError) {
        return res.status(401).json({ message: "Google signup session expired. Please sign in with Google again." });
      }

      if (decoded?.purpose !== "google-signup" || !decoded?.email || !decoded?.googleId) {
        return res.status(400).json({ message: "Invalid Google signup session." });
      }

      if (!password || String(password).trim().length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
      }

      normalizedEmail = decoded.email.toLowerCase();
      normalizedName = normalizedName || decoded.name || decoded.email.split("@")[0];
      googleIdFromToken = decoded.googleId;
    }

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!normalizedName) {
      return res.status(400).json({ message: "Name is required" });
    }

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      googleId: googleIdFromToken,
      role: "user", // Always default to user for registration
      profile: {
        companyName: company || "",
      },
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Check if user exists and has a password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "An error occurred during login. Please try again." });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const googleLogin = async (req, res) => {
  const { idToken, accessToken, userInfo } = req.body || {};
  const googleToken = accessToken || idToken;

  if (!googleToken) {
    return res.status(400).json({ message: "No token provided" });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res
      .status(500)
      .json({ message: "Google client ID is not configured on the server" });
  }

  try {
    let name;
    let email;
    let googleId;
    let googleProfile = userInfo || {};

    // Detect token type: JWT id_token has 3 dot-separated segments; access_token doesn't.
    const isIdToken = typeof googleToken === "string" && googleToken.split(".").length === 3;

    if (isIdToken) {
      // Verify JWT id_token directly with Google.
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        return res
          .status(400)
          .json({ message: "Invalid Google token payload" });
      }
      googleProfile = payload;
      name = payload.name;
      email = payload.email;
      googleId = payload.sub;
    } else {
      // Access token flow: validate the token with Google's tokeninfo endpoint.
      const tokenInfo = await getGoogleTokenInfo(googleToken);
      googleProfile = { ...tokenInfo, ...googleProfile };

      // tokeninfo returns user_id for Google accounts; userInfo provides the name.
      name = googleProfile.name || userInfo?.name || "Google User";
      email = googleProfile.email || userInfo?.email;
      googleId = googleProfile.sub || googleProfile.user_id || userInfo?.sub;

      if (!email || !googleId) {
        return res.status(401).json({
          message: "Invalid Google access token",
          detail: "Missing email or Google user id",
        });
      }
    }

    console.log("✅ Google Auth success for:", email);

    let user = await User.findOne({ email });

    if (!user) {
      if (!email || !googleId) {
        return res.status(400).json({
          message: "Incomplete Google profile",
          detail: "Google response did not include the required identity fields",
        });
      }

      const googleSignupToken = generateGoogleSignupToken({
        email,
        name: name || email?.split("@")[0] || "Google User",
        googleId,
      });

      return res.status(200).json({
        needsRegistration: true,
        user: {
          name: name || email?.split("@")[0] || "Google User",
          email,
        },
        googleSignupToken,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (name && !user.name) {
        user.name = name;
      }
      await user.save();
    } else if (user.googleId !== googleId) {
      return res.status(409).json({
        message: "Google account mismatch",
        detail: "This email is already linked to a different Google account",
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const detail =
      error.response?.data?.error_description ||
      error.response?.data?.error ||
      error.message;

    console.error("❌ Google Login Error:", detail);
    if (
      error.message?.includes("Token used too late") ||
      error.message?.includes("Token expired")
    ) {
      return res
        .status(401)
        .json({ message: "Google token expired. Please try again." });
    }
    if (statusCode === 401) {
      return res.status(401).json({
        message: "Invalid Google token",
        detail,
      });
    }

    res.status(statusCode).json({
      message: "Google authentication failed",
      detail,
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      if (req.body.password) {
        user.password = req.body.password;
      }
      if (req.body.profile) {
        // If profile doesn't exist yet, initialize it
        if (!user.profile) {
          user.profile = {};
        }

        // Merge individual fields
        if (req.body.profile.companyName !== undefined)
          user.profile.companyName = req.body.profile.companyName;
        if (req.body.profile.phone !== undefined)
          user.profile.phone = req.body.profile.phone;
        if (req.body.profile.businessStage !== undefined)
          user.profile.businessStage = req.body.profile.businessStage;
        if (req.body.profile.industry !== undefined)
          user.profile.industry = req.body.profile.industry;

        // Mark as modified to ensure Mongoose saves nested changes
        user.markModified("profile");
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profile: updatedUser.profile,
        token: req.body.password ? generateToken(updatedUser._id) : undefined,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Update Profile Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
