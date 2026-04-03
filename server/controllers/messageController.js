// controllers/messageController.js
const Messages = require("../models/messageModel");
const User = require("../models/userModel");

const areFriends = async (userAId, userBId) => {
  const user = await User.findById(userAId).select("friends");
  if (!user) return false;
  return user.friends.some((fid) => fid.toString() === userBId.toString());
};

// GET /api/messages/getmsg
// Body: { from, to, after? }
// Returns messages between two users. If `after` (ISO timestamp) is provided,
// only messages newer than that timestamp are returned (used for polling).
module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to, after } = req.body;

    if (!from || !to)
      return res.status(400).json({ msg: "from and to are required" });

    const friends = await areFriends(from, to);
    if (!friends)
      return res.status(403).json({ msg: "You can only message your friends" });

    const query = { users: { $all: [from, to] } };
    if (after) query.createdAt = { $gt: new Date(after) };

    const messages = await Messages.find(query).sort({ createdAt: 1 });

    // Return the correct ciphertext copy depending on who is requesting.
    // The sender reads encryptedForSender; the recipient reads encryptedForRecipient.
    const projected = messages.map((msg) => ({
      _id: msg._id,
      fromSelf: msg.sender.toString() === from,
      // The requesting client (identified by `from`) decrypts using their own private key.
      // If they sent it → use encryptedForSender. If they received it → use encryptedForRecipient.
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
// Body: { from, to, encryptedForSender, encryptedForRecipient }
module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, encryptedForSender, encryptedForRecipient } = req.body;

    if (!from || !to || !encryptedForSender || !encryptedForRecipient)
      return res.status(400).json({ msg: "from, to, encryptedForSender, and encryptedForRecipient are required" });

    const friends = await areFriends(from, to);
    if (!friends)
      return res.status(403).json({ msg: "You can only message your friends" });

    const data = await Messages.create({
      message: { encryptedForSender, encryptedForRecipient },
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully.", _id: data._id, createdAt: data.createdAt });
    return res.status(500).json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

// GET /api/messages/unread
// Body: { userId }
// Returns a map of { senderId: unreadCount } for the notification badges.
// "Unread" = messages where the recipient is userId and createdAt is after their lastSeen.
// Since we don't track per-message read status, we use a simpler approach:
// return the count of messages received in the last poll interval per sender.
module.exports.getUnreadCounts = async (req, res, next) => {
  try {
    const { userId, since } = req.body;
    if (!userId) return res.status(400).json({ msg: "userId is required" });

    const query = {
      users: userId,
      sender: { $ne: userId },
    };
    if (since) query.createdAt = { $gt: new Date(since) };

    const messages = await Messages.find(query).select("sender createdAt");

    // Group by sender
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
