// routes/calls.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  createOffer,
  postAnswer,
  addCandidate,
  getIncoming,
  getStatus,
  getCandidates,
  endCall,
} = require("../controllers/callController");

router.post("/offer",           auth, createOffer);
router.post("/answer",          auth, postAnswer);
router.post("/candidate",       auth, addCandidate);
router.get("/incoming",         auth, getIncoming);
router.get("/status/:callId",   auth, getStatus);
router.get("/candidates/:callId", auth, getCandidates);
router.post("/end",             auth, endCall);

module.exports = router;
