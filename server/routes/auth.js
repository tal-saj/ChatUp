const express = require("express");
const router = express.Router();

const {
  login,
  register,
  getAllUsers,
  setAvatar,
  logOut,
} = require("../controllers/userController");


// Public routes
router.post("/login", /* authLimiter, validateLogin, */ login);
router.post("/register", /* authLimiter, validateRegister, */ register);

// Protected routes (should use auth middleware in production)
router.get("/allusers/:id", /* authMiddleware, */ getAllUsers);
router.post("/set-avatar/:id", /* authMiddleware, */ setAvatar);

// Logout – changed to POST (more secure)
router.post("/logout", /* authMiddleware, */ logOut);

module.exports = router;