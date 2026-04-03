// controllers/messageController.js
const Messages = require("../models/messageModel");
const User = require("../models/userModel");

// Helper – confirms that userA and userB are mutual friends
const areFriends = async (userAId, userBId) => {
  const user = await User.findById(userAId).select("friends");
  if (!user) return false;
  return user.friends.some((fid) => fid.toString() === userBId.toString());
};

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({ msg: "from and to are required" });
    }

    // Only friends can read each other's messages
    const friends = await areFriends(from, to);
    if (!friends) {
      return res.status(403).json({ msg: "You can only message your friends" });
    }

    const messages = await Messages.find({
      users: { $all: [from, to] },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => ({
      fromSelf: msg.sender.toString() === from,
      message: msg.message.text,
    }));

    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;

    if (!from || !to || !message) {
      return res.status(400).json({ msg: "from, to, and message are required" });
    }

    // Only friends can send messages to each other
    const friends = await areFriends(from, to);
    if (!friends) {
      return res.status(403).json({ msg: "You can only message your friends" });
    }

    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.status(500).json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};