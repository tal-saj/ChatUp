// index.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./lib/connectDB");
const authRoutes = require("./routes/routes_auth");   // ← kept original filename
const messageRoutes = require("./routes/messages");
const friendsRoutes = require("./routes/friends");

require("dotenv").config();

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: [
    "https://chat-up-frontend-three.vercel.app",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Short-circuit ALL OPTIONS preflights before DB middleware
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  return res.sendStatus(200);
});

app.use(express.json());

// ── DB middleware ─────────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection error:", err.message);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// ── Debug routes ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "Chat App API",
    version: "1.0.0",
    status: "online",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.get("/debug", (req, res) => {
  res.json({
    message: "Backend is alive",
    time: new Date().toISOString(),
    mongoReadyState: mongoose.connection.readyState,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendsRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");

  console.error("SERVER ERROR:", {
    message: err.message,
    stack: err.stack?.substring(0, 500),
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
