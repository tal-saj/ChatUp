// models/userModel.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 20,
    unique: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50,
    trim: true,
    lowercase: true,
  },

  password: {
    type: String,
    required: true,
    minlength: 8,
  },

  isAvatarImageSet: {
    type: Boolean,
    default: false,
  },

  avatarImage: {
    type: String,
    default: "",
  },

  // ── E2E Encryption ──────────────────────────────
  // Stores the user's RSA-OAEP public key as a JWK JSON string.
  // The private key NEVER leaves the client.
  publicKey: {
    type: String,
    default: "",
  },

  // ── Online Status ────────────────────────────────
  // Updated by the client every ~30s via heartbeat endpoint.
  lastSeen: {
    type: Date,
    default: null,
  },

  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  ],

  friendRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  ],

  sentRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  ],
});

module.exports = mongoose.model("Users", userSchema);
