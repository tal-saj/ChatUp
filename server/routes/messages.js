// routes/messages.js
const { addMessage, getMessages, getUnreadCounts } = require("../controllers/messageController");
const router = require("express").Router();

router.post("/addmsg/", addMessage);
router.post("/getmsg/", getMessages);
router.post("/unread/", getUnreadCounts);

module.exports = router;
