// controllers/userController.js
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Sign a JWT for the given userId
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Strip password from a Mongoose doc safely and attach token
const sanitizeUser = (mongooseDoc) => {
  const obj = mongooseDoc.toObject();
  delete obj.password;
  obj.token = signToken(obj._id);
  return obj;
};

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Use .select("+password") in case schema hides it by default
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect Username or Password", status: false });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Username or Password", status: false });

    return res.json({ status: true, user: sanitizeUser(user) });
  } catch (ex) {
    next(ex);
  }
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });

    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, username, password: hashedPassword });

    return res.json({ status: true, user: sanitizeUser(user) });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } }).select(
      "email username avatarImage _id"
    );
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(
      userId,
      { isAvatarImageSet: true, avatarImage },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports.logOut = (req, res, next) => {
  try {
    // userId comes from body (POST /logout sends { userId })
    const userId = req.body.userId || req.params.id;
    if (!userId) return res.status(400).json({ msg: "User id is required" });
    // onlineUsers tracking is socket-side only; nothing to clean up here
    return res.status(200).json({ msg: "Logged out successfully" });
  } catch (ex) {
    next(ex);
  }
};