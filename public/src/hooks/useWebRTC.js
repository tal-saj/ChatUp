// hooks/useWebRTC.js
import { useRef, useCallback } from "react";
import api from "../utils/axiosConfig";
import {
  callOfferRoute,
  callAnswerRoute,
  callCandidateRoute,
  callStatusRoute,
  callCandidatesRoute,
  callEndRoute,
} from "../utils/APIRoutes";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
  video: false,
};

const VIDEO_CONSTRAINTS = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
};

const CANDIDATE_POLL_MS  = 1_000;
const STATUS_POLL_MS     = 1_500;
const CANDIDATE_DRAIN_MS = 500;

export function useWebRTC({ onCallEnded, onRemoteStream }) {
  const pcRef            = useRef(null);
  const localStreamRef   = useRef(null);
  const callIdRef        = useRef(null);
  const roleRef          = useRef(null);
  const callTypeRef      = useRef(null);
  const statusPollRef    = useRef(null);
  const candidatePollRef = useRef(null);
  const seenCandidates   = useRef(new Set());

  // ── Guard against double-hangup (concurrent ICE failure + manual hang up) ──
  const hangingUpRef = useRef(false);

  // ── Store callbacks in refs so closures inside createPeerConnection are stable
  const onCallEndedRef   = useRef(onCallEnded);
  const onRemoteStreamRef = useRef(onRemoteStream);
  onCallEndedRef.current   = onCallEnded;
  onRemoteStreamRef.current = onRemoteStream;

  // ── Internal cleanup ────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(statusPollRef.current);
    clearInterval(candidatePollRef.current);
    statusPollRef.current    = null;
    candidatePollRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    callIdRef.current     = null;
    roleRef.current       = null;
    callTypeRef.current   = null;
    hangingUpRef.current  = false;
    seenCandidates.current = new Set();
  }, []);

  // ── One-shot drain of remaining candidates ──────────────────────────────────
  const drainCandidates = useCallback(async () => {
    if (!callIdRef.current || !pcRef.current) return;
    try {
      const { data } = await api.get(
        `${callCandidatesRoute}/${callIdRef.current}?role=${roleRef.current}`
      );
      for (const raw of data.candidates ?? []) {
        if (seenCandidates.current.has(raw)) continue;
        seenCandidates.current.add(raw);
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(raw)));
        } catch { /* stale */ }
      }
    } catch { /* ignore */ }
  }, []);

  // ── Hang up — safe to call multiple times ───────────────────────────────────
  const hangup = useCallback(async (reason = "ended") => {
    if (hangingUpRef.current) return; // already hanging up
    hangingUpRef.current = true;

    const id = callIdRef.current;
    cleanup();

    if (id) {
      try { await api.post(callEndRoute, { callId: id, reason }); } catch { /* ignore */ }
    }
    onCallEndedRef.current?.(reason);
  }, [cleanup]);

  // ── Build RTCPeerConnection ──────────────────────────────────────────────────
  // Uses refs for hangup/drainCandidates so event handlers always have
  // the latest version regardless of when they fire.
  const hangupRef       = useRef(hangup);
  const drainRef        = useRef(drainCandidates);
  hangupRef.current     = hangup;
  drainRef.current      = drainCandidates;

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async ({ candidate }) => {
      if (!candidate || !callIdRef.current) return;
      try {
        await api.post(callCandidateRoute, {
          callId: callIdRef.current,
          candidate: JSON.stringify(candidate),
          role: roleRef.current,
        });
      } catch { /* non-fatal */ }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("[WebRTC] ICE:", state);

      if (state === "connected" || state === "completed") {
        clearInterval(statusPollRef.current);
        clearInterval(candidatePollRef.current);
        setTimeout(() => drainRef.current(), CANDIDATE_DRAIN_MS);
      }

      if (state === "failed") {
        console.warn("[WebRTC] ICE failed — restarting");
        pc.restartIce();
      }

      if (state === "disconnected") {
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            hangupRef.current("ended");
          }
        }, 4_000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection:", pc.connectionState);
      if (pc.connectionState === "failed") {
        hangupRef.current("ended");
      }
    };

    // ── CRITICAL: this is where audio is delivered ───────────────────────────
    // ontrack fires when the remote peer's audio track arrives.
    // We pass the full MediaStream to the parent so it can attach it to
    // the persistent <audio> element that lives in Chat.jsx.
    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack fired, streams:", event.streams.length);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        onRemoteStreamRef.current?.(remoteStream);
      }
    };

    return pc;
  }, []); // no deps — uses refs for everything mutable

  // ── Get local media ─────────────────────────────────────────────────────────
  const getLocalStream = useCallback(async (callType = "audio") => {
    const constraints = callType === "video" ? VIDEO_CONSTRAINTS : AUDIO_CONSTRAINTS;
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    return stream;
  }, []);

  const addLocalTracks = useCallback((pc, stream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  // ── Poll for remote ICE candidates ──────────────────────────────────────────
  const startCandidatePolling = useCallback(() => {
    clearInterval(candidatePollRef.current);

    const poll = async () => {
      if (!callIdRef.current || !pcRef.current) return;
      try {
        const { data } = await api.get(
          `${callCandidatesRoute}/${callIdRef.current}?role=${roleRef.current}`
        );
        for (const raw of data.candidates ?? []) {
          if (seenCandidates.current.has(raw)) continue;
          seenCandidates.current.add(raw);
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(raw)));
          } catch (err) {
            console.warn("[WebRTC] Bad ICE candidate:", err.message);
          }
        }
      } catch { /* poll silently */ }
    };

    poll();
    candidatePollRef.current = setInterval(poll, CANDIDATE_POLL_MS);
  }, []);

  // ── CALLER: initiate a call ──────────────────────────────────────────────────
  const startCall = useCallback(
    async ({ calleeId, callType = "audio" }) => {
      callTypeRef.current = callType;
      roleRef.current     = "caller";
      seenCandidates.current = new Set();
      hangingUpRef.current   = false;

      const pc = createPeerConnection();
      pcRef.current = pc;

      const stream = await getLocalStream(callType);
      addLocalTracks(pc, stream);

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
        voiceActivityDetection: true,
      });
      await pc.setLocalDescription(offer);

      const { data } = await api.post(callOfferRoute, {
        calleeId,
        offer: JSON.stringify(offer),
        callType,
      });

      callIdRef.current = data.callId;

      // Poll for answer
      clearInterval(statusPollRef.current);
      statusPollRef.current = setInterval(async () => {
        try {
          const { data: s } = await api.get(`${callStatusRoute}/${callIdRef.current}`);

          if (s.status === "active" && s.answer) {
            clearInterval(statusPollRef.current);
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(s.answer)));
            startCandidatePolling();
          }

          if (["ended", "rejected", "missed"].includes(s.status)) {
            clearInterval(statusPollRef.current);
            cleanup();
            onCallEndedRef.current?.(s.status);
          }
        } catch { /* poll silently */ }
      }, STATUS_POLL_MS);

      return data.callId;
    },
    [createPeerConnection, getLocalStream, addLocalTracks, startCandidatePolling, cleanup]
  );

  // ── CALLEE: accept an incoming call ─────────────────────────────────────────
  const acceptCall = useCallback(
    async ({ callId, offer, callType = "audio" }) => {
      callIdRef.current      = callId;
      callTypeRef.current    = callType;
      roleRef.current        = "callee";
      seenCandidates.current = new Set();
      hangingUpRef.current   = false;

      const pc = createPeerConnection();
      pcRef.current = pc;

      const stream = await getLocalStream(callType);
      addLocalTracks(pc, stream);

      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await api.post(callAnswerRoute, { callId, answer: JSON.stringify(answer) });

      startCandidatePolling();
    },
    [createPeerConnection, getLocalStream, addLocalTracks, startCandidatePolling]
  );

  // ── Reject without answering ─────────────────────────────────────────────────
  const rejectCall = useCallback(async (callId) => {
    try { await api.post(callEndRoute, { callId, reason: "rejected" }); } catch { /* ignore */ }
    cleanup();
    onCallEndedRef.current?.("rejected");
  }, [cleanup]);

  // ── Mute / unmute ────────────────────────────────────────────────────────────
  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }, []);

  const setVideoEnabled = useCallback((enabled) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = enabled; });
  }, []);

  return { startCall, acceptCall, rejectCall, hangup, setMuted, setVideoEnabled };
}
