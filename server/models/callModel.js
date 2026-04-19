// models/callModel.js
const mongoose = require("mongoose");

const callSchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
    index: true,
  },
  callee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
    index: true,
  },
  callType: {
    type: String,
    enum: ["audio", "video"], // video-ready from day 1
    default: "audio",
  },
  offer: {
    type: String, // SDP offer JSON string
    default: null,
  },
  answer: {
    type: String, // SDP answer JSON string
    default: null,
  },
  // ICE candidates stored as arrays per side
  // Each entry: { candidate, sdpMid, sdpMLineIndex }
  callerCandidates: {
    type: [String],
    default: [],
  },
  calleeCandidates: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ["ringing", "active", "ended", "rejected", "missed"],
    default: "ringing",
    index: true,
  },
  startedAt: {
    type: Date,
    default: null, // set when answer arrives
  },
  endedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL index — MongoDB auto-deletes call docs after 1 hour
    // regardless of status (keeps collection tiny)
    expires: 3600,
  },
});

module.exports = mongoose.model("Call", callSchema);
