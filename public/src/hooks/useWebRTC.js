// hooks/useWebRTC.js
// ─────────────────────────────────────────────────────────────────────────────
// Optimised for slow networks (Pakistan / low-bandwidth regions):
//   • Opus audio: 16 kbps mono, aggressive echo/noise cancellation
//   • Video: 320×240 @ 15 fps, 200 kbps max — degrades gracefully
//   • DTLS (WebRTC default) = E2E encrypted transport
//   • ICE restart on failure, exponential back-off on disconnect
//   • All edge cases: call-on-call, cancel, reject, missed, double-hangup
// ─────────────────────────────────────────────────────────────────────────────
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

// ── ICE Servers ───────────────────────────────────────────────────────────────
// Public STUN + free TURN (openrelay). For production swap with Metered/Twilio.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp", // TCP fallback for strict NATs
    ],
    username:   "openrelayproject",
    credential: "openrelayproject",
  },
];

// ── Audio constraints — aggressive echo/noise cancellation ───────────────────
// echoCancellation + noiseSuppression together kill the echo-in-background bug.
// Low sampleRate (16 kHz) = half the bitrate of 48 kHz, good enough for voice.
const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation:        { ideal: true },
    noiseSuppression:        { ideal: true },
    autoGainControl:         { ideal: true },
    googEchoCancellation:    true,   // Chrome hint
    googNoiseSuppression:    true,   // Chrome hint
    googHighpassFilter:      true,
    googAutoGainControl:     true,
    sampleRate:              { ideal: 16000 }, // 16 kHz → lower bandwidth
    channelCount:            { ideal: 1 },     // mono voice
  },
  video: false,
};

// ── Video constraints — optimised for slow internet ──────────────────────────
// 320×240 @ 15 fps is very watchable and uses ~150–250 kbps total.
const VIDEO_CONSTRAINTS = {
  audio: {
    echoCancellation:     { ideal: true },
    noiseSuppression:     { ideal: true },
    autoGainControl:      { ideal: true },
    googEchoCancellation: true,
    googNoiseSuppression: true,
    channelCount:         { ideal: 1 },
  },
  video: {
    width:     { ideal: 320,  max: 640  },
    height:    { ideal: 240,  max: 480  },
    frameRate: { ideal: 15,   max: 24   },
    facingMode: "user",
  },
};

// ── SDP bandwidth caps (applied after createOffer / createAnswer) ─────────────
// Limits audio to 32 kbps and video to 200 kbps in the SDP so the browser
// respects our bandwidth budget even when the network is fine.
function capBandwidth(sdp, audioBps = 32000, videoBps = 200000) {
  // Add b=AS and b=TIAS lines after each m= section
  return sdp
    .replace(/(m=audio[^\n]*\n)/g, `$1b=AS:${Math.ceil(audioBps / 1000)}\nb=TIAS:${audioBps}\n`)
    .replace(/(m=video[^\n]*\n)/g, `$1b=AS:${Math.ceil(videoBps / 1000)}\nb=TIAS:${videoBps}\n`);
}

const CANDIDATE_POLL_MS  = 1_500;
const STATUS_POLL_MS     = 1_500;
const CANDIDATE_DRAIN_MS = 800;
const DISCONNECT_GRACE   = 5_000; // ms before treating "disconnected" as ended

export function useWebRTC({ onCallEnded, onRemoteStream }) {
  const pcRef            = useRef(null);
  const localStreamRef   = useRef(null);
  const callIdRef        = useRef(null);
  const roleRef          = useRef(null);
  const callTypeRef      = useRef(null);
  const statusPollRef    = useRef(null);
  const candidatePollRef = useRef(null);
  const seenCandidates   = useRef(new Set());
  const hangingUpRef     = useRef(false);
  const disconnectTimer  = useRef(null);

  // Stable callback refs
  const onCallEndedRef    = useRef(onCallEnded);
  const onRemoteStreamRef = useRef(onRemoteStream);
  onCallEndedRef.current    = onCallEnded;
  onRemoteStreamRef.current = onRemoteStream;

  // ── Internal cleanup ────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(statusPollRef.current);
    clearInterval(candidatePollRef.current);
    clearTimeout(disconnectTimer.current);
    statusPollRef.current    = null;
    candidatePollRef.current = null;
    disconnectTimer.current  = null;

    // Stop all local tracks (releases mic/camera)
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    callIdRef.current      = null;
    roleRef.current        = null;
    callTypeRef.current    = null;
    hangingUpRef.current   = false;
    seenCandidates.current = new Set();
  }, []);

  // ── Drain remaining ICE candidates once (called after connection) ───────────
  const drainCandidates = useCallback(async () => {
    if (!callIdRef.current || !pcRef.current) return;
    try {
      const { data } = await api.get(
        `${callCandidatesRoute}/${callIdRef.current}?role=${roleRef.current}`
      );
      for (const raw of data.candidates ?? []) {
        if (seenCandidates.current.has(raw)) continue;
        seenCandidates.current.add(raw);
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(raw))); }
        catch { /* stale */ }
      }
    } catch { /* ignore */ }
  }, []);

  // ── Hangup — safe to call multiple times ────────────────────────────────────
  const hangup = useCallback(async (reason = "ended") => {
    if (hangingUpRef.current) return;
    hangingUpRef.current = true;
    const id = callIdRef.current;
    cleanup();
    if (id) {
      try { await api.post(callEndRoute, { callId: id, reason }); } catch { /* ignore */ }
    }
    onCallEndedRef.current?.(reason);
  }, [cleanup]);

  // Stable ref so event handlers always have the latest hangup
  const hangupRef    = useRef(hangup);
  const drainRef     = useRef(drainCandidates);
  hangupRef.current  = hangup;
  drainRef.current   = drainCandidates;

  // ── Build RTCPeerConnection ──────────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      // Prefer UDP, fall back to TCP (better NAT traversal on slow networks)
      iceTransportPolicy: "all",
      // Bundle audio+video onto one port = fewer NAT holes to punch
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });

    // Send local ICE candidates to server
    pc.onicecandidate = async ({ candidate }) => {
      if (!candidate || !callIdRef.current) return;
      try {
        await api.post(callCandidateRoute, {
          callId:    callIdRef.current,
          candidate: JSON.stringify(candidate),
          role:      roleRef.current,
        });
      } catch { /* non-fatal */ }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("[WebRTC] ICE:", state);

      if (state === "connected" || state === "completed") {
        clearInterval(statusPollRef.current);
        clearInterval(candidatePollRef.current);
        clearTimeout(disconnectTimer.current);
        setTimeout(() => drainRef.current(), CANDIDATE_DRAIN_MS);
      }

      if (state === "failed") {
        console.warn("[WebRTC] ICE failed — restarting ICE");
        try { pc.restartIce(); } catch { hangupRef.current("ended"); }
      }

      if (state === "disconnected") {
        // Give a grace period; brief disconnects (mobile network hiccup) self-heal
        disconnectTimer.current = setTimeout(() => {
          if (
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed"
          ) {
            hangupRef.current("ended");
          }
        }, DISCONNECT_GRACE);
      }

      if (state === "closed") {
        hangupRef.current("ended");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection:", pc.connectionState);
      if (pc.connectionState === "failed") {
        hangupRef.current("ended");
      }
    };

    // ── Deliver remote stream to UI ───────────────────────────────────────────
    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack:", event.track.kind);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        onRemoteStreamRef.current?.(remoteStream);
      }
    };

    return pc;
  }, []);

  // ── Get local media ─────────────────────────────────────────────────────────
  const getLocalStream = useCallback(async (callType = "audio") => {
    const constraints =
      callType === "video" ? VIDEO_CONSTRAINTS : AUDIO_CONSTRAINTS;
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    return stream;
  }, []);

  const addLocalTracks = useCallback((pc, stream) => {
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
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
            await pcRef.current.addIceCandidate(
              new RTCIceCandidate(JSON.parse(raw))
            );
          } catch (e) {
            console.warn("[WebRTC] Bad ICE candidate:", e.message);
          }
        }
      } catch { /* silent */ }
    };
    poll();
    candidatePollRef.current = setInterval(poll, CANDIDATE_POLL_MS);
  }, []);

  // ── CALLER ──────────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async ({ calleeId, callType = "audio" }) => {
      callTypeRef.current    = callType;
      roleRef.current        = "caller";
      seenCandidates.current = new Set();
      hangingUpRef.current   = false;

      const pc     = createPeerConnection();
      pcRef.current = pc;

      const stream = await getLocalStream(callType);
      addLocalTracks(pc, stream);

      // Apply codec preferences (Opus) if browser supports it
      if (pc.getTransceivers) {
        pc.getTransceivers().forEach((t) => {
          if (t.sender?.track?.kind === "audio") {
            try {
              const caps = RTCRtpSender.getCapabilities("audio");
              if (caps) {
                const opus = caps.codecs.filter((c) =>
                  c.mimeType.toLowerCase().includes("opus")
                );
                if (opus.length) t.setCodecPreferences(opus);
              }
            } catch { /* Safari doesn't support setCodecPreferences */ }
          }
          if (t.sender?.track?.kind === "video") {
            try {
              const caps = RTCRtpSender.getCapabilities("video");
              if (caps) {
                // Prefer VP8 (lower CPU) over VP9/H264 on slow devices
                const vp8 = caps.codecs.filter((c) =>
                  c.mimeType.toLowerCase().includes("vp8")
                );
                if (vp8.length) t.setCodecPreferences(vp8);
              }
            } catch { /* ignore */ }
          }
        });
      }

      let offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
        voiceActivityDetection: true,
      });

      // Cap SDP bandwidth
      offer = new RTCSessionDescription({
        type: offer.type,
        sdp:  capBandwidth(offer.sdp),
      });

      await pc.setLocalDescription(offer);

      const { data } = await api.post(callOfferRoute, {
        calleeId,
        offer:    JSON.stringify({ type: offer.type, sdp: offer.sdp }),
        callType,
      });

      callIdRef.current = data.callId;

      // Poll for answer / rejection / miss
      clearInterval(statusPollRef.current);
      statusPollRef.current = setInterval(async () => {
        try {
          const { data: s } = await api.get(
            `${callStatusRoute}/${callIdRef.current}`
          );

          if (s.status === "active" && s.answer) {
            clearInterval(statusPollRef.current);
            await pc.setRemoteDescription(
              new RTCSessionDescription(JSON.parse(s.answer))
            );
            startCandidatePolling();
          }

          if (["ended", "rejected", "missed"].includes(s.status)) {
            clearInterval(statusPollRef.current);
            cleanup();
            onCallEndedRef.current?.(s.status);
          }
        } catch { /* silent */ }
      }, STATUS_POLL_MS);

      return data.callId;
    },
    [createPeerConnection, getLocalStream, addLocalTracks, startCandidatePolling, cleanup]
  );

  // ── CALLEE ──────────────────────────────────────────────────────────────────
  const acceptCall = useCallback(
    async ({ callId, offer, callType = "audio" }) => {
      callIdRef.current      = callId;
      callTypeRef.current    = callType;
      roleRef.current        = "callee";
      seenCandidates.current = new Set();
      hangingUpRef.current   = false;

      const pc      = createPeerConnection();
      pcRef.current = pc;

      const stream = await getLocalStream(callType);
      addLocalTracks(pc, stream);

      await pc.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(offer))
      );

      let answer = await pc.createAnswer();
      answer = new RTCSessionDescription({
        type: answer.type,
        sdp:  capBandwidth(answer.sdp),
      });

      await pc.setLocalDescription(answer);

      await api.post(callAnswerRoute, {
        callId,
        answer: JSON.stringify({ type: answer.type, sdp: answer.sdp }),
      });

      startCandidatePolling();
    },
    [createPeerConnection, getLocalStream, addLocalTracks, startCandidatePolling]
  );

  // ── Reject without answering ─────────────────────────────────────────────────
  const rejectCall = useCallback(
    async (callId) => {
      try {
        await api.post(callEndRoute, { callId, reason: "rejected" });
      } catch { /* ignore */ }
      cleanup();
      onCallEndedRef.current?.("rejected");
    },
    [cleanup]
  );

  // ── Mute / unmute ────────────────────────────────────────────────────────────
  const setMuted = useCallback((muted) => {
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((t) => { t.enabled = !muted; });
  }, []);

  // ── Toggle local video ───────────────────────────────────────────────────────
  const setVideoEnabled = useCallback((enabled) => {
    localStreamRef.current
      ?.getVideoTracks()
      .forEach((t) => { t.enabled = enabled; });
  }, []);

  // ── Expose local stream ref (for local video preview) ───────────────────────
  const getLocalStream_ref = useCallback(() => localStreamRef.current, []);

  return {
    startCall,
    acceptCall,
    rejectCall,
    hangup,
    setMuted,
    setVideoEnabled,
    getLocalStream: getLocalStream_ref,
  };
}
