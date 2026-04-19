// controllers/messageController.js
const Messages = require("../models/messageModel");
const User = require("../models/userModel");

const areFriends = async (userAId, userBId) => {
  const user = await User.findById(userAId).select("friends");
  if (!user) return false;
  return user.friends.some((fid) => fid.toString() === userBId.toString());
};

// GET /api/messages/getmsg
// Body: { to, after? }
module.exports.getMessages = async (req, res, next) => {
  try {
    const from = req.user.id; // ✅ from JWT
    const { to, after } = req.body;

    if (!to)
      return res.status(400).json({ msg: "to is required" });

    const friends = await areFriends(from, to);
    if (!friends)
      return res.status(403).json({ msg: "You can only message your friends" });

    const query = { users: { $all: [from, to] } };
    if (after) query.createdAt = { $gt: new Date(after) };

    const messages = await Messages.find(query).sort({ createdAt: 1 });

    const projected = messages.map((msg) => ({
      _id: msg._id,
      fromSelf: msg.sender.toString() === from,
      encryptedMessage:
        msg.sender.toString() === from
          ? msg.message.encryptedForSender
          : msg.message.encryptedForRecipient,
      createdAt: msg.createdAt,
    }));

    res.json(projected);
  } catch (ex) {
    next(ex);
  }
};

// POST /api/messages/addmsg
// Body: { to, encryptedForSender, encryptedForRecipient }
module.exports.addMessage = async (req, res, next) => {
  try {
    const from = req.user.id; // ✅ from JWT
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
      users: [from, to],
      sender: from,
    });

    if (data)
      return res.json({
        msg: "Message added successfully.",
        _id: data._id,
        createdAt: data.createdAt,
      });

    return res
      .status(500)
      .json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

// GET /api/messages/unread
// Body: { since }
module.exports.getUnreadCounts = async (req, res, next) => {
  try {
    const userId = req.user.id; // ✅ from JWT
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