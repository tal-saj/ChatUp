// controllers/userController.js
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const sanitizeUser = (mongooseDoc) => {
  const obj = mongooseDoc.toObject();
  delete obj.password;
  obj.token = signToken(obj._id);
  return obj;
};

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
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

// ─── Returns only the current user's accepted friends ───────────────────────
// Route: GET /api/auth/allusers/:id
// The :id param is the current user's _id (kept for frontend compatibility).
module.exports.getAllUsers = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.params.id)
      .select("friends")
      .populate("friends", "email username avatarImage _id");

    if (!currentUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.json(currentUser.friends);
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
    const userId = req.body.userId || req.params.id;
    if (!userId) return res.status(400).json({ msg: "User id is required" });
    return res.status(200).json({ msg: "Logged out successfully" });
  } catch (ex) {
    next(ex);
  }
};
