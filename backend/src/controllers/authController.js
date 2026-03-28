import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

export const registerUser = async (req, res) => {
  const { name, email, password, company } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
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
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
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
    res.status(500).json({ message: error.message });
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
  const { idToken, userInfo } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "No token provided" });
  }

  try {
    let name, email, googleId;

    // Detect token type: JWT id_token has 3 dot-separated segments; access_token doesn't
    const isIdToken = idToken.split(".").length === 3;

    if (isIdToken) {
      // --- Original popup flow: verify JWT id_token ---
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload)
        return res
          .status(400)
          .json({ message: "Invalid Google token payload" });
      name = payload.name;
      email = payload.email;
      googleId = payload.sub;
    } else {
      // --- Redirect flow: verify access_token via Google tokeninfo ---
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${idToken}`,
      );
      const tokenInfo = await tokenInfoRes.json();

      if (tokenInfo.error) {
        return res.status(401).json({ message: "Invalid Google access token" });
      }

      // Use the userInfo object sent alongside the token from the frontend
      if (!userInfo || !userInfo.email) {
        return res
          .status(400)
          .json({ message: "User info missing from request" });
      }

      name = userInfo.name;
      email = userInfo.email;
      googleId = userInfo.sub;
    }

    console.log("✅ Google Auth success for:", email);

    let user = await User.findOne({ email });

    if (!user) {
      console.log("ℹ️  User not found, requesting registration for:", email);
      return res.json({
        needsRegistration: true,
        user: { name, email, googleId },
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
    console.error("❌ Google Login Error:", error.message);
    if (
      error.message?.includes("Token used too late") ||
      error.message?.includes("Token expired")
    ) {
      return res
        .status(401)
        .json({ message: "Google token expired. Please try again." });
    }
    res.status(500).json({
      message: "Google authentication failed",
      detail: error.message,
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
