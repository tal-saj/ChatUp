// models/messageModel.js
const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema(
  {
    message: {
      // Text messages — encrypted with RSA-OAEP (existing flow)
      encryptedForSender: { type: String, default: null },
      encryptedForRecipient: { type: String, default: null },
    },

    // Media messages — file stored on Cloudinary (encrypted blob)
    media: {
      // Public Cloudinary URL of the encrypted blob
      url: { type: String, default: null },
      // Cloudinary public_id (needed to delete later)
      publicId: { type: String, default: null },
      // Original MIME type so the client knows how to render after decrypt
      mimeType: { type: String, default: null },
      // Original file name (for documents / download label)
      fileName: { type: String, default: null },
      // File size in bytes (for documents preview)
      fileSize: { type: Number, default: null },
      // AES key wrapped with sender's RSA public key (base64)
      wrappedKeyForSender: { type: String, default: null },
      // AES key wrapped with recipient's RSA public key (base64)
      wrappedKeyForRecipient: { type: String, default: null },
    },

    // "text" | "image" | "video" | "audio" | "document"
    messageType: {
      type: String,
      enum: ["text", "image", "video", "audio", "document"],
      default: "text",
    },

    users: Array,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Messages", MessageSchema);
