import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";

// Route Imports
import onboardingRoutes from "./src/routes/onboardingRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import leadRoutes from "./src/routes/leadRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import serviceRoutes from "./src/routes/serviceRoutes.js";
import paymentRoutes from "./src/routes/paymentRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origins (all vite dev ports + production)
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  process.env.FRONTEND_URL,
].filter(Boolean);

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        ALLOWED_ORIGINS.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com")
      ) {
        callback(null, true);
      } else {
        console.error(`CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);
app.use(
  express.json({
    limit: "50mb",
    // Razorpay webhook signatures are computed over the exact raw request
    // bytes — capture them here since body-parsing would otherwise be lossy.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("dev"));

// Security Headers for Google OAuth
app.use((req, res, next) => {
  // Reverting to unsafe-none for maximum compatibility with Google OAuth postMessage flows
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error(
    "CRITICAL: MONGODB_URI is not defined in environment variables.",
  );
} else {
  // Log connection attempts (but hide password for security)
  const maskedUri = MONGO_URI.replace(/:([^@]+)@/, ":****@");
  console.log("Connecting to MongoDB:", maskedUri);

  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    })
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("MongoDB Connection Error:", err.message);
    });
}

// Debugging connection state
mongoose.connection.on("error", (err) => {
  console.error("Mongoose Error:", err);
});

// Register Routes
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/", (req, res) => {
  const states = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting",
  };
  res.json({
    message: "Vithartha Consulting Backend API is Running",
    database: states[mongoose.connection.readyState] || "Unknown",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);

  // Prevent sleep in production (for services like Render, Heroku free tiers)
  const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
  const serverUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;

  if (serverUrl) {
    setInterval(async () => {
      try {
        if (typeof fetch === "function") {
          await fetch(serverUrl);
        } else {
          // Fallback for older Node versions
          const lib = serverUrl.startsWith("https")
            ? await import("https")
            : await import("http");

          lib.default
            .get(serverUrl, () => {})
            .on("error", (err) => {
              console.error(`[Keep-Alive] Ping failed: ${err.message}`);
            });
        }
      } catch (err) {
        console.error(`[Keep-Alive] Ping error: ${err.message}`);
      }
    }, PING_INTERVAL);
  }
});

export default app;
