// index.js – Vercel Serverless Functions (HTTP API only)

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./lib/connectDB");

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

require("dotenv").config();

const app = express();


// ────────────────────────────────────────────────
// ENV DEBUG (optional – remove later)
// ────────────────────────────────────────────────
console.log("=== MONGO ENV DEBUG ===");
console.log("MONGO_URL exists?", !!process.env.MONGO_URL);
console.log("MONGO_URL length:", process.env.MONGO_URL?.length || 0);
console.log(
  "MONGO_URL first 60 chars:",
  process.env.MONGO_URL?.substring(0, 60) || "MISSING"
);
console.log("=== MONGO ENV DEBUG END ===");


// ────────────────────────────────────────────────
// CORS – allow frontend domains
// ────────────────────────────────────────────────
app.use(cors());

app.use(express.json());


// ────────────────────────────────────────────────
// ⭐ AUTO CONNECT DB BEFORE EVERY REQUEST
// (Critical for Vercel serverless)
// ────────────────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection middleware error:", err.message);
    res.status(500).json({
      error: "Database connection failed",
      details: err.message,
    });
  }
});


// ────────────────────────────────────────────────
// Debug routes
// ────────────────────────────────────────────────
app.get("/debug", (req, res) => {
  res.json({
    message: "Backend is alive",
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "unknown",
    mongoReadyState: mongoose.connection.readyState, // should now be 1
  });
});


app.get("/test-db", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();

    res.json({
      status: "MongoDB ping successful",
      readyState: mongoose.connection.readyState,
    });

  } catch (err) {
    console.error("DB test error:", err.message);
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
app.use("/api/friends", require("./routes/friends"));

// ────────────────────────────────────────────────
// Global error handler
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
  });
});


// ────────────────────────────────────────────────
// Export for Vercel
// ────────────────────────────────────────────────
module.exports = app;
