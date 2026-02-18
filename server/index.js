// index.js – Vercel Serverless Functions (HTTP API only)

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

require("dotenv").config();

const app = express();
app.get("/debug", (req, res) => {
  res.json({
    message: "Backend is alive",
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "unknown"
  });
});
// CORS – update origins as needed
app.use(cors({
  origin: [
    "https://chat-up-frontend-three.vercel.app",
    "http://localhost:3000",
    // Add any other frontend domains (e.g. custom domain)
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// MongoDB connection – modern syntax (no deprecated options)
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("DB Connection Successful"))
  .catch((err) => console.error("DB Connection Error:", err.message));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Optional: global error handler (recommended for serverless)
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Export for Vercel
module.exports = app;