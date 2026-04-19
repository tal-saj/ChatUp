// controllers/callController.js
const { v4: uuidv4 } = require("uuid");
const Call = require("../models/callModel");
const User = require("../models/userModel");

// ── Helpers ──────────────────────────────────────────────────────────────────

const areFriends = async (userAId, userBId) => {
  const user = await User.findById(userAId).select("friends");
  if (!user) return false;
  return user.friends.some((fid) => fid.toString() === userBId.toString());
};

// ── POST /api/calls/offer ────────────────────────────────────────────────────
// Caller creates a call and posts their SDP offer.
// Body: { calleeId, offer (SDP string), callType? }
exports.createOffer = async (req, res, next) => {
  try {
    const callerId = req.user.id;
    const { calleeId, offer, callType = "audio" } = req.body;

    if (!calleeId || !offer)
      return res.status(400).json({ msg: "calleeId and offer are required" });

    if (callerId === calleeId)
      return res.status(400).json({ msg: "Cannot call yourself" });

    const friends = await areFriends(callerId, calleeId);
    if (!friends)
      return res.status(403).json({ msg: "You can only call your friends" });

    // Cancel any previous ringing call from this caller to this callee
    await Call.updateMany(
      { caller: callerId, callee: calleeId, status: "ringing" },
      { status: "missed", endedAt: new Date() }
    );

    const callId = uuidv4();
    const call = await Call.create({
      callId,
      caller: callerId,
      callee: calleeId,
      offer,
      callType,
    });

    return res.status(201).json({ callId: call.callId });
  } catch (ex) {
    next(ex);
  }
};

// ── POST /api/calls/answer ───────────────────────────────────────────────────
// Callee accepts the call and posts their SDP answer.
// Body: { callId, answer (SDP string) }
exports.postAnswer = async (req, res, next) => {
  try {
    const calleeId = req.user.id;
    const { callId, answer } = req.body;

    if (!callId || !answer)
      return res.status(400).json({ msg: "callId and answer are required" });

    const call = await Call.findOne({ callId });

    if (!call)
      return res.status(404).json({ msg: "Call not found" });

    if (call.callee.toString() !== calleeId)
      return res.status(403).json({ msg: "Not authorised" });

    if (call.status !== "ringing")
      return res.status(400).json({ msg: "Call is no longer ringing" });

    call.answer = answer;
    call.status = "active";
    call.startedAt = new Date();
    await call.save();

    return res.json({ ok: true });
  } catch (ex) {
    next(ex);
  }
};

// ── POST /api/calls/candidate ────────────────────────────────────────────────
// Either side pushes ICE candidates as they are generated.
// Body: { callId, candidate (JSON string), role: "caller" | "callee" }
exports.addCandidate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { callId, candidate, role } = req.body;

    if (!callId || !candidate || !role)
      return res.status(400).json({ msg: "callId, candidate, and role are required" });

    const call = await Call.findOne({ callId });
    if (!call)
      return res.status(404).json({ msg: "Call not found" });

    // Verify the requester is actually part of this call
    const isCaller = call.caller.toString() === userId;
    const isCallee = call.callee.toString() === userId;
    if (!isCaller && !isCallee)
      return res.status(403).json({ msg: "Not part of this call" });

    // Push to the correct array
    if (role === "caller") {
      call.callerCandidates.push(candidate);
    } else {
      call.calleeCandidates.push(candidate);
    }

    await call.save();
    return res.json({ ok: true });
  } catch (ex) {
    next(ex);
  }
};

// ── GET /api/calls/incoming ──────────────────────────────────────────────────
// Callee polls this every 2s to see if someone is calling them.
// Returns the ringing call doc if one exists.
exports.getIncoming = async (req, res, next) => {
  try {
    const calleeId = req.user.id;

    const call = await Call.findOne({ callee: calleeId, status: "ringing" })
      .populate("caller", "username avatarImage")
      .sort({ createdAt: -1 })
      .lean();

    if (!call) return res.json(null);

    return res.json({
      callId: call.callId,
      caller: call.caller,
      callType: call.callType,
      offer: call.offer,
    });
  } catch (ex) {
    next(ex);
  }
};

// ── GET /api/calls/status/:callId ────────────────────────────────────────────
// Caller polls this after posting an offer to see if callee answered/rejected.
exports.getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { callId } = req.params;

    const call = await Call.findOne({ callId }).lean();

    if (!call) return res.status(404).json({ msg: "Call not found" });

    // Verify requester is part of the call
    if (
      call.caller.toString() !== userId &&
      call.callee.toString() !== userId
    ) {
      return res.status(403).json({ msg: "Not part of this call" });
    }

    return res.json({
      status: call.status,
      answer: call.answer,
      callType: call.callType,
    });
  } catch (ex) {
    next(ex);
  }
};

// ── GET /api/calls/candidates/:callId ───────────────────────────────────────
// Either side polls for new ICE candidates from the other side.
// Query param: ?role=caller means "I am the caller, give me callee's candidates"
exports.getCandidates = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { callId } = req.params;
    // role = who the REQUESTER is
    const { role } = req.query;

    const call = await Call.findOne({ callId }).lean();
    if (!call) return res.status(404).json({ msg: "Call not found" });

    if (
      call.caller.toString() !== userId &&
      call.callee.toString() !== userId
    ) {
      return res.status(403).json({ msg: "Not part of this call" });
    }

    // Return the OTHER side's candidates
    const candidates =
      role === "caller" ? call.calleeCandidates : call.callerCandidates;

    return res.json({ candidates });
  } catch (ex) {
    next(ex);
  }
};

// ── POST /api/calls/end ──────────────────────────────────────────────────────
// Either side ends or rejects the call.
// Body: { callId, reason?: "rejected" | "ended" | "missed" }
exports.endCall = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { callId, reason = "ended" } = req.body;

    if (!callId)
      return res.status(400).json({ msg: "callId is required" });

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ msg: "Call not found" });

    if (
      call.caller.toString() !== userId &&
      call.callee.toString() !== userId
    ) {
      return res.status(403).json({ msg: "Not part of this call" });
    }

    // Only update if not already ended
    if (!["ended", "rejected", "missed"].includes(call.status)) {
      call.status =
        reason === "rejected"
          ? "rejected"
          : reason === "missed"
          ? "missed"
          : "ended";
      call.endedAt = new Date();
      await call.save();
    }

    return res.json({ ok: true });
  } catch (ex) {
    next(ex);
  }
};
