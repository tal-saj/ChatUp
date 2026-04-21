// routes/messages.js
const { addMessage, getMessages, getUnreadCounts, addMediaMessage } = require("../controllers/messageController");
const router = require("express").Router();
const auth = require("../middleware/auth");

router.post("/addmsg/",    auth, addMessage);
router.post("/addmedia/",  auth, addMediaMessage);
router.post("/getmsg/",    auth, getMessages);
router.post("/unread/",    auth, getUnreadCounts);

module.exports = router;
