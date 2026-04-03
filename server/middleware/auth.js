// routes/auth.js
const express = require("express");
const router = express.Router();

const {
  login,
  register,
  getAllUsers,
  setAvatar,
  logOut,
  uploadPublicKey,
  heartbeat,
} = require("../controllers/userController");

// Public
router.post("/login", login);
router.post("/register", register);

// Protected (auth middleware skipped for simplicity — add if needed)
router.get("/allusers/:id", getAllUsers);
router.post("/setavatar/:id", setAvatar);
router.post("/logout", logOut);

// E2E encryption — store the user's RSA public key
router.post("/uploadkey", uploadPublicKey);

// Online status heartbeat
router.post("/heartbeat", heartbeat);

module.exports = router;
