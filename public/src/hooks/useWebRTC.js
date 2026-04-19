// hooks/useWebRTC.js
// Encapsulates all RTCPeerConnection logic.
// Designed to work with REST polling as the signaling transport.
// Video-ready: just pass callType="video" and a localVideoRef to upgrade later.

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

// ── ICE server config ─────────────────────────────────────────────────────────
// Google STUN (free, unlimited) + Open Relay TURN (free 50GB/mo tier).
// Swap openrelay credentials for your own Metered.ca key in production.
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

// ── Audio quality constraints ─────────────────────────────────────────────────
// echoCancellation + noiseSuppression dramatically improve call quality.
// When adding video, merge { video: { width: 1280, height: 720, frameRate: 30 } }
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
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 30 },
  },
};

// ── Polling intervals ─────────────────────────────────────────────────────────
const CANDIDATE_POLL_MS  = 1_000; // poll ICE candidates every 1s during setup
const STATUS_POLL_MS     = 1_500; // poll for answer every 1.5s
const CANDIDATE_DRAIN_MS = 500;   // check for remaining candidates after connection

export function useWebRTC({ onCallEnded, onRemoteStream }) {
  const pcRef            = useRef(null);  // RTCPeerConnection
  const localStreamRef   = useRef(null);  // our mic/camera stream
  const callIdRef        = useRef(null);  // current call ID
  const roleRef          = useRef(null);  // "caller" | "callee"
  const callTypeRef      = useRef(null);  // "audio" | "video"
  const statusPollRef    = useRef(null);  // setInterval for answer polling
  const candidatePollRef = useRef(null);  // setInterval for ICE candidate polling
  const seenCandidates   = useRef(new Set()); // dedupe candidates

   // ── Internal cleanup ─────────────────────────────────────────────────────────
  const cleanup = useCallback(async () => {
    clearInterval(statusPollRef.current);
    clearInterval(candidatePollRef.current);

    // Stop all local media tracks (releases mic/camera indicator)
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Close peer connection
    pcRef.current?.close();
    pcRef.current = null;

    callIdRef.current = null;
    roleRef.current = null;
    seenCandidates.current = new Set();
  }, []);

  // ── Build RTCPeerConnection with all event handlers ─────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // When we generate an ICE candidate, push it to the server
    pc.onicecandidate = async ({ candidate }) => {
      if (!candidate || !callIdRef.current) return;
      try {
        await api.post(callCandidateRoute, {
          callId: callIdRef.current,
          candidate: JSON.stringify(candidate),
          role: roleRef.current,
        });
      } catch { /* non-fatal — candidate may retry */ }
    };

    // ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("[WebRTC] ICE state:", state);

      if (state === "connected" || state === "completed") {
        // Connected — stop all polling, start lightweight candidate drain
        clearInterval(statusPollRef.current);
        clearInterval(candidatePollRef.current);
        // One more drain after connection for any stragglers
        setTimeout(() => drainCandidates(), CANDIDATE_DRAIN_MS);
      }

      if (state === "failed") {
        // ICE restart attempt — gives WebRTC a second chance through TURN
        console.warn("[WebRTC] ICE failed, attempting restart");
        pc.restartIce();
      }

      if (state === "disconnected") {
        // Transient — wait a moment before treating as ended
        setTimeout(() => {
          if (
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed"
          ) {
            hangup("ended");
          }
        }, 4_000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      if (pc.connectionState === "failed") {
        hangup("ended");
      }
    };

    // When we receive the remote audio/video stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream && onRemoteStream) {
        onRemoteStream(remoteStream);
      }
    };

    return pc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRemoteStream]);

  // ── Get local media (mic or mic+camera) ─────────────────────────────────────
  const getLocalStream = useCallback(async (callType = "audio") => {
    const constraints =
      callType === "video" ? VIDEO_CONSTRAINTS : AUDIO_CONSTRAINTS;
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    return stream;
  }, []);

  // ── Add local stream tracks to peer connection ───────────────────────────────
  const addLocalTracks = useCallback((pc, stream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  // ── Poll for ICE candidates from the other side ──────────────────────────────
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

    poll(); // immediate first poll
    candidatePollRef.current = setInterval(poll, CANDIDATE_POLL_MS);
  }, []);

  // One-shot drain of remaining candidates (after connection established)
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
        } catch { /* stale candidate, ignore */ }
      }
    } catch { /* ignore */ }
  }, []);

  // ── CALLER: initiate a call ──────────────────────────────────────────────────
  const startCall = useCallback(
    async ({ calleeId, callType = "audio" }) => {
      callTypeRef.current = callType;
      roleRef.current = "caller";
      seenCandidates.current = new Set();

      const pc = createPeerConnection();
      pcRef.current = pc;

      const stream = await getLocalStream(callType);
      addLocalTracks(pc, stream);

      // Create SDP offer with audio-specific optimisations
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
        voiceActivityDetection: true, // saves bandwidth during silence
      });
      await pc.setLocalDescription(offer);

      const { data } = await api.post(callOfferRoute, {
        calleeId,
        offer: JSON.stringify(offer),
        callType,
      });

      callIdRef.current = data.callId;

      // Poll for the answer
      clearInterval(statusPollRef.current);
      statusPollRef.current = setInterval(async () => {
        try {
          const { data: statusData } = await api.get(
            `${callStatusRoute}/${callIdRef.current}`
          );

          if (statusData.status === "active" && statusData.answer) {
            clearInterval(statusPollRef.current);
            const answer = JSON.parse(statusData.answer);
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            startCandidatePolling();
          }

          if (["ended", "rejected", "missed"].includes(statusData.status)) {
            clearInterval(statusPollRef.current);
            await cleanup();
            onCallEnded?.(statusData.status);
          }
        } catch { /* poll silently */ }
      }, STATUS_POLL_MS);

      // Start collecting our own ICE candidates immediately
      // (they'll be pushed to server via onicecandidate)
      return data.callId;
    },
    [createPeerConnection, getLocalStream, addLocalTracks, startCandidatePolling, onCallEnded, cleanup]
  );

  // ── CALLEE: accept an incoming call ─────────────────────────────────────────
  const acceptCall = useCallback(
    async ({ callId, offer, callType = "audio" }) => {
      callIdRef.current = callId;
      callTypeRef.current = callType;
      roleRef.current = "callee";
      seenCandidates.current = new Set();

      const pc = createPeerConnection();
      pcRef.current = pc;

      const stream = await getLocalStream(callType);
      addLocalTracks(pc, stream);

      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await api.post(callAnswerRoute, {
        callId,
        answer: JSON.stringify(answer),
      });

      // Start polling for caller's ICE candidates
      startCandidatePolling();
    },
    [createPeerConnection, getLocalStream, addLocalTracks, startCandidatePolling]
  );

  // ── Reject without answering ─────────────────────────────────────────────────
  const rejectCall = useCallback(async (callId) => {
    try {
      await api.post(callEndRoute, { callId, reason: "rejected" });
    } catch { /* ignore */ }
    await cleanup();
    onCallEnded?.("rejected");
  }, [onCallEnded, cleanup]);

  // ── Mute / unmute local audio ────────────────────────────────────────────────
  const setMuted = useCallback((muted) => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, []);

  // ── Toggle local video (future use) ─────────────────────────────────────────
  const setVideoEnabled = useCallback((enabled) => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }, []);

  // ── Hang up from either side ─────────────────────────────────────────────────
  const hangup = useCallback(async (reason = "ended") => {
    const id = callIdRef.current;
    await cleanup();
    if (id) {
      try {
        await api.post(callEndRoute, { callId: id, reason });
      } catch { /* ignore */ }
    }
    onCallEnded?.(reason);
  }, [onCallEnded, cleanup]);

 

  return {
    startCall,
    acceptCall,
    rejectCall,
    hangup,
    setMuted,
    setVideoEnabled,
  };
}
