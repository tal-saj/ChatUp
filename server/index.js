// index.js  (for Vercel deployment – HTTP API only)

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

require("dotenv").config();

const app = express();

app.use(cors({
  origin: ["https://chat-up-frontend-three.vercel.app", "http://localhost:3000"],
  credentials: true,
}));

app.use(express.json());

// MongoDB connection (runs once per cold start – fine for serverless)
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.error("DB Connection Error:", err.message);
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// VERY IMPORTANT: Do NOT call app.listen() on Vercel
// Export the app so Vercel can invoke it as a serverless function
module.exports = app;