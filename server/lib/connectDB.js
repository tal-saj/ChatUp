// lib/connectDB.js
const mongoose = require("mongoose");

// Cache the connection promise across warm invocations on Vercel
let connectionPromise = null;

module.exports = async function connectDB() {
  const state = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting — both are fine, just wait
  if (state === 1) return;
  if (state === 2) return mongoose.connection.asPromise();

  // If a connection attempt is already in flight, reuse it
  if (connectionPromise) return connectionPromise;

  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL environment variable is not set");
  }

  connectionPromise = mongoose
    .connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 5000, // fail fast instead of hanging
      socketTimeoutMS: 10000,
    })
    .then((db) => {
      console.log("MongoDB connected");
      connectionPromise = null; // clear so reconnect works after a drop
      return db;
    })
    .catch((err) => {
      connectionPromise = null; // clear so next request can retry
      throw err;
    });

  return connectionPromise;
};