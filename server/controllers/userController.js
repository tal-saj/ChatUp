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

// Returns only friends, including their publicKey and lastSeen for E2E + online status
module.exports.getAllUsers = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.params.id)
      .select("friends")
      .populate("friends", "email username avatarImage _id publicKey lastSeen");

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

// ── Upload public key after key generation on client ────────────────────────
// Called once after login/register when the client generates its RSA key pair.
// Body: { userId, publicKey }  (publicKey is a JWK JSON string)
module.exports.uploadPublicKey = async (req, res, next) => {
  try {
    const { userId, publicKey } = req.body;
    if (!userId || !publicKey)
      return res.status(400).json({ msg: "userId and publicKey are required" });

    await User.findByIdAndUpdate(userId, { publicKey });
    return res.json({ msg: "Public key saved" });
  } catch (ex) {
    next(ex);
  }
};

// ── Heartbeat – client calls this every 30s to mark itself online ────────────
// Body: { userId }
module.exports.heartbeat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ msg: "userId is required" });

    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
    return res.json({ ok: true });
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
