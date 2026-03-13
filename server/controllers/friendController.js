// controllers/friendController.js
const Users = require("../models/User");
const FriendRequest = require("../models/FriendRequest");

exports.searchUsers = async (req, res) => {
  const { username } = req.query;

  const users = await Users.find({
    username: { $regex: username, $options: "i" },
  }).select("username avatarImage");

  res.json(users);
};

exports.recommendedUsers = async (req, res) => {
  const userId = req.user.id;

  const users = await Users.find({
    _id: { $ne: userId },
  })
    .limit(10)
    .select("username avatarImage");

  res.json(users);
};

exports.sendRequest = async (req, res) => {
  const { userId } = req.body;

  const request = await FriendRequest.create({
    from: req.user.id,
    to: userId,
  });

  res.json(request);
};

exports.getRequests = async (req, res) => {
  const requests = await FriendRequest.find({
    to: req.user.id,
    status: "pending",
  }).populate("from", "username avatarImage");

  res.json(requests);
};

exports.acceptRequest = async (req, res) => {
  const { requestId } = req.body;

  const request = await FriendRequest.findById(requestId);

  request.status = "accepted";
  await request.save();

  await Users.findByIdAndUpdate(request.from, {
    $push: { friends: request.to },
  });

  await Users.findByIdAndUpdate(request.to, {
    $push: { friends: request.from },
  });

  res.json({ msg: "Friend added" });
};

exports.rejectRequest = async (req, res) => {
  const { requestId } = req.body;

  await FriendRequest.findByIdAndUpdate(requestId, {
    status: "rejected",
  });

  res.json({ msg: "Request rejected" });
};