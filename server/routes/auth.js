const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { login, register, getAllUsers, setAvatar, logOut, uploadPublicKey, heartbeat } = require("../controllers/userController");

router.post("/login", login);
router.post("/register", register);
router.get("/allusers/:id", auth, getAllUsers);
router.post("/setavatar/:id", auth, setAvatar);
router.post("/logout", auth, logOut);
router.post("/uploadkey", auth, uploadPublicKey);
router.post("/heartbeat", auth, heartbeat);

module.exports = router;