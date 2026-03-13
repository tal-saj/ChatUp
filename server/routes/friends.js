// routes/friends.js
const router = require("express").Router();
const auth = require("../middleware/auth");

const {
  searchUsers,
  recommendedUsers,
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
} = require("../controllers/friendController");

router.get("/search", auth, searchUsers);
router.get("/recommended", auth, recommendedUsers);
router.get("/requests", auth, getRequests);

router.post("/send-request", auth, sendRequest);
router.post("/accept", auth, acceptRequest);
router.post("/reject", auth, rejectRequest);

module.exports = router;