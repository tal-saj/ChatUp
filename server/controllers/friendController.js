// controllers/friendController.js
const Users = require("../models/userModel");
const FriendRequest = require("../models/FriendRequest");

exports.searchUsers = async (req, res, next) => {
  try {
    const { username } = req.query;
    if (!username || !username.trim()) return res.json([]);

    const users = await Users.find({
      _id: { $ne: req.user.id },
      username: { $regex: username.trim(), $options: "i" },
    })
      .limit(20)
      .select("username avatarImage");

    res.json(users);
  } catch (ex) {
    next(ex);
  }
};

exports.recommendedUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const currentUser = await Users.findById(userId).select("friends");
    const alreadyFriends = currentUser?.friends ?? [];

    const existingRequests = await FriendRequest.find({
      $or: [{ from: userId }, { to: userId }],
      status: "pending",
    }).select("from to");

    const excludedIds = new Set([
      userId,
      ...alreadyFriends.map(String),
      ...existingRequests.map((r) =>
        r.from.toString() === userId ? r.to.toString() : r.from.toString()
      ),
    ]);

    const users = await Users.find({ _id: { $nin: [...excludedIds] } })
      .limit(10)
      .select("username avatarImage");

    res.json(users);
  } catch (ex) {
    next(ex);
  }
};

exports.sendRequest = async (req, res, next) => {
  try {
    const fromId = req.user.id;
    const { userId: toId } = req.body;

    if (!toId)
      return res.status(400).json({ msg: "userId is required" });

    if (fromId === toId)
      return res.status(400).json({ msg: "Cannot send a friend request to yourself" });

    const existing = await FriendRequest.findOne({
      $or: [
        { from: fromId, to: toId },
        { from: toId, to: fromId },
      ],
      status: { $in: ["pending", "accepted"] },
    });

    if (existing)
      return res.status(409).json({ msg: "Friend request already exists or already friends" });

    const request = await FriendRequest.create({ from: fromId, to: toId });
    res.status(201).json(request);
  } catch (ex) {
    next(ex);
  }
};

exports.getRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({
      to: req.user.id,
      status: "pending",
    }).populate("from", "username avatarImage");

    res.json(requests);
  } catch (ex) {
    next(ex);
  }
};

exports.acceptRequest = async (req, res, next) => {
  try {
    const { requestId } = req.body;

    if (!requestId)
      return res.status(400).json({ msg: "requestId is required" });

    const request = await FriendRequest.findById(requestId);

    if (!request)
      return res.status(404).json({ msg: "Friend request not found" });

    if (request.to.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorised to accept this request" });

    if (request.status !== "pending")
      return res.status(400).json({ msg: "Request is no longer pending" });

    request.status = "accepted";
    await request.save();

    // $addToSet prevents duplicates if accepted twice
    await Users.findByIdAndUpdate(request.from, {
      $addToSet: { friends: request.to },
    });
    await Users.findByIdAndUpdate(request.to, {
      $addToSet: { friends: request.from },
    });

    res.json({ msg: "Friend added" });
  } catch (ex) {
    next(ex);
  }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { requestId } = req.body;

    if (!requestId)
      return res.status(400).json({ msg: "requestId is required" });

    const request = await FriendRequest.findById(requestId);

    if (!request)
      return res.status(404).json({ msg: "Friend request not found" });

    if (request.to.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorised to reject this request" });

    await FriendRequest.findByIdAndUpdate(requestId, { status: "rejected" });
    res.json({ msg: "Request rejected" });
  } catch (ex) {
    next(ex);
  }
};
