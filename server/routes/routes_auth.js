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

router.post("/login", login);
router.post("/register", register);
router.get("/allusers/:id", getAllUsers);
router.post("/setavatar/:id", setAvatar);
router.post("/logout", logOut);
router.post("/uploadkey", uploadPublicKey);
router.post("/heartbeat", heartbeat);

module.exports = router;
