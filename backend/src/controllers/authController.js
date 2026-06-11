import User from "../models/User.js";
import Session from "../models/Session.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isBcryptHash = (value) => /^\$2[aby]?\$\d{2}\$/.test(String(value || ""));

const isPasswordMatch = async (plainPassword, storedPassword) => {
  if (!storedPassword) return false;

  return isBcryptHash(storedPassword)
    ? bcrypt.compare(plainPassword, storedPassword)
    : String(storedPassword) === String(plainPassword);
};

const findUsersByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  return User.find({
    email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
  });
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

const createSession = async (token, userId, req) => {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const sessionData = {
      token,
      user: userId,
      userAgent: req?.headers?.['user-agent'] || '',
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || '',
      expiresAt,
    };

    const session = new Session(sessionData);

    return await session.save();
  } catch (err) {
    console.error('Failed to create session record:', err?.message || err);
  }
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
    let normalizedEmail = normalizeEmail(email);
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

    let userExists = await User.findOne({ email: normalizedEmail });

    if (!userExists && normalizedEmail) {
      userExists = await User.findOne({
        email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
      });
    }

    if (userExists) {
      if (googleSignupToken) {
        if (userExists.googleId && userExists.googleId !== googleIdFromToken) {
          return res.status(409).json({
            message: "Google account mismatch",
            detail: "This email is already linked to a different Google account",
          });
        }

        if (!userExists.googleId && googleIdFromToken) {
          userExists.googleId = googleIdFromToken;
        }

        userExists.name = normalizedName || userExists.name;
        userExists.email = normalizedEmail;
        userExists.profile = {
          ...(userExists.profile || {}),
          companyName: company || userExists.profile?.companyName || "",
        };

        if (!userExists.password || (password && isBcryptHash(userExists.password) && await bcrypt.compare(password, userExists.password))) {
          if (password && !userExists.password) {
            userExists.password = password;
          }

          const savedUser = await userExists.save();
          const token = generateToken(savedUser._id);
          await createSession(token, savedUser._id, req);
          return res.status(200).json({
            _id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            role: savedUser.role,
            token,
          });
        }

        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      if (userExists.googleId) {
        return res.status(409).json({
          message: "Account already exists",
          detail: "This email is linked to a Google account. Please continue with Google sign in.",
        });
      }

      if (userExists.password) {
        const isPasswordValid = isBcryptHash(userExists.password)
          ? await bcrypt.compare(password, userExists.password)
          : String(userExists.password) === String(password);

        if (isPasswordValid) {
          const token = generateToken(userExists._id);
          await createSession(token, userExists._id, req);
          return res.status(200).json({
            _id: userExists._id,
            name: userExists.name,
            email: userExists.email,
            role: userExists.role,
            token,
          });
        }
      }

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
      const token = generateToken(user._id);
      await createSession(token, user._id, req);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
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

    const normalizedEmail = normalizeEmail(email);

    const matchedUsers = await findUsersByEmail(normalizedEmail);

    if (!matchedUsers.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const exactEmailMatches = matchedUsers.filter(
      (user) => normalizeEmail(user.email) === normalizedEmail,
    );
    const candidateUsers = [
      ...exactEmailMatches,
      ...matchedUsers.filter((user) => normalizeEmail(user.email) !== normalizedEmail),
    ];

    const passwordCandidates = candidateUsers.filter((candidate) => candidate.password);

    if (!passwordCandidates.length) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    let user = null;
    for (const candidate of passwordCandidates) {
      if (await isPasswordMatch(password, candidate.password)) {
        user = candidate;
        break;
      }
    }

    if (user) {
      const token = generateToken(user._id);
      await createSession(token, user._id, req);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      });
    } else {
      const userForLog = passwordCandidates[0];
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

  console.log("[GoogleLogin] Request received", {
    hasToken: !!googleToken,
    tokenType: accessToken ? "accessToken" : (idToken ? "idToken" : "none"),
    bodyKeys: Object.keys(req.body || {})
  });

  if (!googleToken) {
    console.warn("Ã¢Å¡Â Ã¯Â¸Â [GoogleLogin] No token provided");
    return res.status(400).json({ message: "No token provided" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  try {
    let name;
    let email;
    let googleId;
    let googleProfile = userInfo || {};

    // Detect token type: JWT id_token has 3 dot-separated segments; access_token doesn't.
    const isIdToken = typeof googleToken === "string" && googleToken.split(".").length === 3;

    try {
      if (isIdToken) {
        if (!clientId) {
          return res.status(500).json({
            message: "Google client ID is not configured on the server",
          });
        }

        // Verify JWT id_token directly with Google.
        const ticket = await client.verifyIdToken({
          idToken: googleToken,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        if (!payload) {
          throw new Error("Invalid Google token payload");
        }
        googleProfile = { ...payload, ...googleProfile };
        name = payload.name;
        email = payload.email;
        googleId = payload.sub;
      } else {
        // Access token flow: validate the token with Google's userinfo endpoint.
        try {
          const backendProfile = await getGoogleProfileFromAccessToken(googleToken);
          googleProfile = { ...backendProfile, ...googleProfile };
        } catch (verifyError) {
          console.warn("Ã¢Å¡Â Ã¯Â¸Â Backend Google verification failed, falling back to frontend userInfo:", verifyError.message);
          // If backend verification fails but we have userInfo from frontend, we can use it as a fallback
          // but we must be careful. For now, if we have no backendProfile, we'll use what we have.
          if (!googleProfile.email && !googleProfile.sub && !googleProfile.id && !googleProfile.user_id) {
            throw verifyError;
          }
        }

        name = googleProfile.name || userInfo?.name || "Google User";
        email = googleProfile.email || userInfo?.email;
        googleId = googleProfile.sub || userInfo?.sub || googleProfile.id || googleProfile.user_id;
      }
    } catch (error) {
      console.error("Ã¢ÂÅ’ Google Token Verification Failed:", error.message);
      return res.status(401).json({
        message: "Google authentication failed",
        detail: error.response?.data?.error_description || error.message
      });
    }

    if (!email || !googleId) {
      console.warn("Ã¢Å¡Â Ã¯Â¸Â [GoogleLogin] Incomplete profile. Email:", email, "GoogleId:", googleId);
      return res.status(400).json({
        message: "Incomplete Google profile",
        detail: "Could not retrieve email or Google ID from the provided token",
      });
    }

    

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedGoogleId = String(googleId || "").trim();

    let user = await User.findOne({ googleId: normalizedGoogleId });

    if (user && user.email !== normalizedEmail) {
      return res.status(409).json({
        message: "Google account mismatch",
        detail: "This Google account is already linked to a different email address",
      });
    }

    if (!user) {
      user = await User.findOne({ email: normalizedEmail });
    }

    if (!user) {
      const googleSignupToken = generateGoogleSignupToken({
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0] || "Google User",
        googleId,
      });

      return res.status(200).json({
        needsRegistration: true,
        user: {
          name: name || normalizedEmail.split("@")[0] || "Google User",
          email: normalizedEmail,
        },
        googleSignupToken,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (name && !user.name) {
        user.name = name;
      }
      try {
        await user.save();
      } catch (saveError) {
        if (saveError?.code === 11000 || String(saveError?.message || "").includes("E11000")) {
          return res.status(409).json({
            message: "Google account mismatch",
            detail: "This Google account is already linked to another user",
          });
        }
        throw saveError;
      }
    } else if (user.googleId !== googleId) {
      return res.status(409).json({
        message: "Google account mismatch",
        detail: "This email is already linked to a different Google account",
      });
    }

    const token = generateToken(user._id);
    await createSession(token, user._id, req);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Ã¢ÂÅ’ Google Login Error:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }

    const statusCode = error.response?.status || 500;
    const detail =
      error.response?.data?.error_description ||
      error.response?.data?.error ||
      error.message;

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
      user.email = req.body.email ? normalizeEmail(req.body.email) : user.email;
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

      let returnedToken;
      if (req.body.password) {
        returnedToken = generateToken(updatedUser._id);
        await createSession(returnedToken, updatedUser._id, req);
      }

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profile: updatedUser.profile,
        token: returnedToken,
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

export const assignUserRole = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ message: "Email and role are required" });
    const normalizedRoleInput = String(role).trim().toLowerCase();
    const isPR = normalizedRoleInput === "pr";
    const isExecutorWithNum = /^executor\d+$/.test(normalizedRoleInput);
    if (!isPR && !isExecutorWithNum) {
      let message;
      if (normalizedRoleInput === "executor") {
        message = "Executor role must include a number, e.g. executor1, executor2 …";
      } else if (/^pr\d+$/.test(normalizedRoleInput)) {
        message = "PR role must be exactly \"pr\" with no number.";
      } else {
        message = "Invalid role. Use \"pr\" for PR role or \"executor1\", \"executor2\" … for Executor role.";
      }
      return res.status(400).json({ message });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
    if (!user) return res.status(404).json({ message: "No user found with that email address" });
    user.role = normalizedRoleInput;
    user.markModified("role");
    await user.save();
    res.json({
      message: `Role updated to ${normalizedRoleInput} for ${user.name}`,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("assignUserRole error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getPRAndExecutors = async (req, res) => {
  try {
    const users = await User.find({
      role: { $regex: /^(pr\d*|executor\d*)$/i }
    }).select("-password").sort({ role: 1, name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    // Keep session records in Atlas for manual review/deletion.
    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

