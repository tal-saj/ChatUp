// models/userModel.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 3,   // was "min" — only works on Numbers, not Strings
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
    // NOTE: we do NOT use select:false here because userController
    // needs to read it for bcrypt.compare, and we strip it manually
    // via toObject() before sending to the client.
  },

  isAvatarImageSet: {
    type: Boolean,
    default: false,
  },

  avatarImage: {
    type: String,
    default: "",
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
