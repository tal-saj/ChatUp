// models/messageModel.js
const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema(
  {
    message: {
      // Stores the RSA-OAEP encrypted ciphertext as a Base64 string.
      // Two copies are stored per message so both parties can decrypt:
      //   encryptedForSender    — encrypted with the sender's public key
      //   encryptedForRecipient — encrypted with the recipient's public key
      // The server never stores or sees the plaintext.
      encryptedForSender: { type: String, required: true },
      encryptedForRecipient: { type: String, required: true },
    },
    users: Array,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Messages", MessageSchema);
