// controllers/messageController.js
const Messages = require("../models/messageModel");
const User = require("../models/userModel");

const areFriends = async (userAId, userBId) => {
  const user = await User.findById(userAId).select("friends");
  if (!user) return false;
  return user.friends.some((fid) => fid.toString() === userBId.toString());
};

// POST /api/messages/getmsg
// Body: { to, after? }
module.exports.getMessages = async (req, res, next) => {
  try {
    const from = req.user.id;
    const { to, after } = req.body;

    if (!to) return res.status(400).json({ msg: "to is required" });

    const friends = await areFriends(from, to);
    if (!friends)
      return res.status(403).json({ msg: "You can only message your friends" });

    const query = { users: { $all: [from, to] } };
    if (after) query.createdAt = { $gt: new Date(after) };

    const messages = await Messages.find(query).sort({ createdAt: 1 });

    const projected = messages.map((msg) => {
      const isSelf = msg.sender.toString() === from;
      const base = {
        _id: msg._id,
        fromSelf: isSelf,
        messageType: msg.messageType || "text",
        createdAt: msg.createdAt,
      };

      if (msg.messageType === "text" || !msg.messageType) {
        base.encryptedMessage = isSelf
          ? msg.message.encryptedForSender
          : msg.message.encryptedForRecipient;
      } else {
        // Media message — send the URL, mimeType, fileName, fileSize,
        // and the correct wrapped AES key for this user
        base.media = {
          url: msg.media.url,
          publicId: msg.media.publicId,
          mimeType: msg.media.mimeType,
          fileName: msg.media.fileName,
          fileSize: msg.media.fileSize,
          wrappedKey: isSelf
            ? msg.media.wrappedKeyForSender
            : msg.media.wrappedKeyForRecipient,
        };
      }

      return base;
    });

    res.json(projected);
  } catch (ex) {
    next(ex);
  }
};

// POST /api/messages/addmsg  — text message (unchanged)
// Body: { to, encryptedForSender, encryptedForRecipient }
module.exports.addMessage = async (req, res, next) => {
  try {
    const from = req.user.id;
    const { to, encryptedForSender, encryptedForRecipient } = req.body;

    if (!to || !encryptedForSender || !encryptedForRecipient)
      return res.status(400).json({
        msg: "to, encryptedForSender, and encryptedForRecipient are required",
      });

    const friends = await areFriends(from, to);
    if (!friends)
      return res.status(403).json({ msg: "You can only message your friends" });

    const data = await Messages.create({
      message: { encryptedForSender, encryptedForRecipient },
      messageType: "text",
      users: [from, to],
      sender: from,
    });

    if (data)
      return res.json({
        msg: "Message added successfully.",
        _id: data._id,
        createdAt: data.createdAt,
      });

    return res.status(500).json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

// POST /api/messages/addmedia  — media message
// Body: { to, url, publicId, mimeType, fileName, fileSize, wrappedKeyForSender, wrappedKeyForRecipient, messageType }
module.exports.addMediaMessage = async (req, res, next) => {
  try {
    const from = req.user.id;
    const {
      to,
      url,
      publicId,
      mimeType,
      fileName,
      fileSize,
      wrappedKeyForSender,
      wrappedKeyForRecipient,
      messageType,
    } = req.body;

    if (!to || !url || !wrappedKeyForSender || !wrappedKeyForRecipient)
      return res.status(400).json({ msg: "Missing required media fields" });

    const friends = await areFriends(from, to);
    if (!friends)
      return res.status(403).json({ msg: "You can only message your friends" });

    const validTypes = ["image", "video", "audio", "document"];
    const type = validTypes.includes(messageType) ? messageType : "document";

    const data = await Messages.create({
      message: { encryptedForSender: "media", encryptedForRecipient: "media" },
      media: {
        url,
        publicId,
        mimeType,
        fileName,
        fileSize,
        wrappedKeyForSender,
        wrappedKeyForRecipient,
      },
      messageType: type,
      users: [from, to],
      sender: from,
    });

    return res.json({
      msg: "Media message added.",
      _id: data._id,
      createdAt: data.createdAt,
    });
  } catch (ex) {
    next(ex);
  }
};

// POST /api/messages/unread
// Body: { since }
module.exports.getUnreadCounts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { since } = req.body;

    const query = {
      users: userId,
      sender: { $ne: userId },
    };
    if (since) query.createdAt = { $gt: new Date(since) };

    const messages = await Messages.find(query).select("sender createdAt");

    const counts = {};
    messages.forEach((msg) => {
      const sid = msg.sender.toString();
      counts[sid] = (counts[sid] || 0) + 1;
    });

    res.json(counts);
  } catch (ex) {
    next(ex);
  }
};
