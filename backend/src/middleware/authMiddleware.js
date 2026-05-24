import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      if (authHeader.includes(" ")) {
        token = authHeader.split(" ")[1];
      } else {
        return res
          .status(401)
          .json({ message: "Malformed Authorization header" });
      }

      if (!token || token === "undefined" || token === "null") {
        return res.status(401).json({ message: "Token is invalid or missing" });
      }

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback_secret",
      );

      // Get user from the token
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Ensure session exists for this token; auto-create if missing (graceful recovery)
      let session = await Session.findOne({ token }).lean();
      if (!session) {
        try {
          const decodedExp = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          const newSession = await Session.create({
            token,
            user: decoded.id,
            userAgent: req?.headers?.['user-agent'] || '',
            ip: req?.ip || req?.headers?.['x-forwarded-for'] || '',
            expiresAt: decodedExp,
          });
        } catch (err) {
          console.error('Failed to auto-create session:', err?.message || err);
        }
      }

      return next();
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
      return res.status(401).json({
        message: "Not authorized",
        detail: error.message,
      });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

export const admin = (req, res, next) => {
  if (req.user && normalizeRole(req.user.role) === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, no user" });
  }

  const normalizedUserRole = normalizeRole(req.user.role);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  if (
    normalizedAllowedRoles.length === 0 ||
    normalizedAllowedRoles.includes(normalizedUserRole)
  ) {
    return next();
  }

  return res.status(403).json({
    message: "Not authorized for this action",
  });
};
