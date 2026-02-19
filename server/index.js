// index.js – Vercel Serverless Functions (HTTP API only)

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

require("dotenv").config();

const app = express();

// ────────────────────────────────────────────────
// Debug MongoDB env var (keep this for now – remove later)
// ────────────────────────────────────────────────
console.log("=== MONGO ENV DEBUG ===");
console.log("MONGO_URL exists?", !!process.env.MONGO_URL);
console.log("MONGO_URL length:", process.env.MONGO_URL?.length || 0);
console.log("MONGO_URL first 60 chars:", process.env.MONGO_URL?.substring(0, 60) || "MISSING");
console.log("Has cluster?", process.env.MONGO_URL?.includes(".mongodb.net") || false);
console.log("Has database name?", process.env.MONGO_URL?.includes("/") && process.env.MONGO_URL?.indexOf("/") > process.env.MONGO_URL?.indexOf(".net") || false);
console.log("=== MONGO ENV DEBUG END ===");

// ────────────────────────────────────────────────
// CORS – allow your frontend domains only
// ────────────────────────────────────────────────
app.use(cors({
  origin: [
    "https://chat-up-frontend-three.vercel.app",
    "http://localhost:3000",
    // Add preview domains or custom domain later if needed
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// ────────────────────────────────────────────────
// MongoDB connection – with better logging & timeout
// ────────────────────────────────────────────────
if (!process.env.MONGO_URL) {
  console.error("CRITICAL: MONGO_URL is missing from environment variables");
} else {
  console.log("Attempting MongoDB connection...");

  mongoose
    .connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,   // Fail fast in serverless
      connectTimeoutMS: 5000,
      socketTimeoutMS: 20000,
    })
    .then(() => {
      console.log("MongoDB connected SUCCESSFULLY");
    })
    .catch((err) => {
      console.error("MongoDB connection FAILED:");
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      console.error("Full error:", JSON.stringify(err, null, 2));
    });

  // Listen to connection events
  mongoose.connection.on("connected", () => console.log("Mongoose event: connected"));
  mongoose.connection.on("error", (err) => console.error("Mongoose event: error", err.message));
  mongoose.connection.on("disconnected", () => console.log("Mongoose event: disconnected"));
}

// ────────────────────────────────────────────────
// Debug routes (keep for now, remove later in production)
// ────────────────────────────────────────────────
app.get("/debug", (req, res) => {
  res.json({
    message: "Backend is alive",
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "unknown",
    mongoReadyState: mongoose.connection.readyState, // 0=disconnected, 1=connected
  });
});

app.get("/test-db", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Mongoose not connected",
        readyState: mongoose.connection.readyState,
      });
    }

    await mongoose.connection.db.admin().ping();
    res.json({ status: "MongoDB ping successful" });
  } catch (err) {
    console.error("DB test error:", err.message, err.stack?.substring(0, 400));
    res.status(500).json({
      error: "MongoDB connection failed",
      details: err.message,
    });
  }
});

// ────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ────────────────────────────────────────────────
// Global error handler (recommended for Vercel)
// ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", {
    message: err.message,
    stack: err.stack?.substring(0, 500),
    path: req.path,
    method: req.method,
    body: req.body,
  });

  res.status(500).json({
    error: "Internal Server Error",
    // Only show message in development (optional)
    // message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ────────────────────────────────────────────────
// Export for Vercel
// ────────────────────────────────────────────────
module.exports = app;