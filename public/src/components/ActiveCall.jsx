// components/ActiveCall.jsx
// Handles both audio-only and video calls.
// Video layout: remote video full-screen, local video PiP (bottom-right).
// Audio layout: same dark card as before.
// Fixes: echo was caused by playing localStream through <audio>. We now only
// attach the REMOTE stream. Local mic is captured by WebRTC — never played back.

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Phone, Mic, MicOff, Video, VideoOff, PhoneCall } from "lucide-react";

export default function ActiveCall({
  contact,
  callType = "audio",
  remoteStream,        // MediaStream from remote peer (audio+video)
  localStreamGetter,   // () => MediaStream — getter for local camera preview
  callerStatus,        // "ringing" | null
  onHangup,
  onMuteChange,
  onVideoChange,
  darkMode,
}) {
  const [muted,     setMuted]     = useState(false);
  const [videoOff,  setVideoOff]  = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [callState, setCallState] = useState(
    callerStatus === "ringing" ? "ringing" : "connecting"
  );

  const remoteAudioRef = useRef(null); // hidden <audio> — remote stream only
  const remoteVideoRef = useRef(null); // full-screen <video> for remote
  const localVideoRef  = useRef(null); // PiP <video> for local camera
  const timerRef       = useRef(null);

  // ── Sync ringing → connecting state ─────────────────────────────────────────
  useEffect(() => {
    if (callerStatus === "ringing") setCallState("ringing");
  }, [callerStatus]);

  // ── Attach REMOTE stream ─────────────────────────────────────────────────────
  // Audio-only call: attach to hidden <audio> element.
  // Video call: attach to <video> element (it carries audio too).
  // KEY FIX: we never attach localStream to any playback element → no echo.
  useLayoutEffect(() => {
    if (!remoteStream) return;

    if (callType === "video" && remoteVideoRef.current) {
      const el = remoteVideoRef.current;
      if (el.srcObject !== remoteStream) el.srcObject = remoteStream;
      el.play().catch(() => {});
    } else if (remoteAudioRef.current) {
      const el = remoteAudioRef.current;
      if (el.srcObject !== remoteStream) el.srcObject = remoteStream;
      const p = el.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn("[Audio] play() blocked:", err.message);
          const retry = () => el.play().catch(() => {});
          document.addEventListener("click",     retry, { once: true });
          document.addEventListener("touchstart", retry, { once: true });
        });
      }
    }

    setCallState("active");
  }, [remoteStream, callType]);

  // ── Attach LOCAL video preview (PiP) ────────────────────────────────────────
  // We attach the local stream to a muted <video> so the user sees themselves.
  // muted=true prevents the speaker from playing the mic → no echo.
  useLayoutEffect(() => {
    if (callType !== "video" || !localVideoRef.current) return;
    const stream = localStreamGetter?.();
    if (!stream) return;
    const el = localVideoRef.current;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play().catch(() => {});
  }, [callType, localStreamGetter, callState]);

  // ── Call timer ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState !== "active") return;
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1_000);
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    const videoEl = remoteVideoRef.current;
    const localEl = localVideoRef.current;
    return () => {
      clearInterval(timerRef.current);
      if (audioEl) audioEl.srcObject = null;
      if (videoEl) videoEl.srcObject = null;
      if (localEl) localEl.srcObject = null;
    };
  }, []);

  const fmt = (s) => {
    const m   = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    onMuteChange?.(next);
  }, [muted, onMuteChange]);

  const toggleVideo = useCallback(() => {
    const next = !videoOff;
    setVideoOff(next);
    onVideoChange?.(next); // tells hook to disable video track
  }, [videoOff, onVideoChange]);

  const statusLabel = {
    ringing:    "Ringing…",
    connecting: "Connecting…",
    active:     fmt(elapsed),
  }[callState];

  const statusColor = callState === "active" ? "text-emerald-400" : "text-slate-400";

  // ════════════════════════════════════════════════════════════════════════════
  // VIDEO CALL LAYOUT
  // ════════════════════════════════════════════════════════════════════════════
  if (callType === "video") {
    return (
      <div className="fixed inset-0 z-[90] bg-black flex items-center justify-center">

        {/* Remote video — full screen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ background: "#000" }}
        />

        {/* Placeholder when remote video hasn't arrived yet */}
        {(!remoteStream || callState !== "active") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-10">
            {/* Animated rings */}
            <div className="relative">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-emerald-400/20"
                  style={{
                    inset: -(i * 30),
                    animation: `waveRing 2.5s ease-out ${i * 0.5}s infinite`,
                  }}
                />
              ))}
              <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-white/10">
                {contact?.avatarImage ? (
                  <img
                    src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                    alt={contact.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-slate-700 flex items-center justify-center text-white text-3xl font-bold">
                    {contact?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">{contact?.username}</h2>
              <p className={`text-sm mt-1 font-medium tabular-nums ${statusColor}`}>
                {statusLabel}
              </p>
            </div>
          </div>
        )}

        {/* Local video — PiP bottom-right */}
        <div className="absolute bottom-24 right-4 z-20 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted          /* CRITICAL: muted prevents local audio playback = no echo */
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }} /* mirror local view */
          />
          {videoOff && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <VideoOff size={24} className="text-slate-400" />
            </div>
          )}
        </div>

        {/* Status bar top */}
        {callState === "active" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white text-sm font-medium tabular-nums">{fmt(elapsed)}</span>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-end gap-4">
          <ControlBtn
            onClick={toggleMute}
            active={muted}
            activeClass="bg-slate-600/90 ring-2 ring-slate-500/40"
            baseClass="bg-black/50 backdrop-blur-sm"
            label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </ControlBtn>

          {/* Hang-up */}
          <button onClick={onHangup} className="flex flex-col items-center gap-1.5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full rotate-[135deg] bg-red-500 text-white shadow-2xl shadow-red-500/50 transition-all hover:bg-red-400 hover:scale-110 active:scale-95">
              <Phone size={26} />
            </span>
            <span className="text-xs text-white/70 font-medium">End</span>
          </button>

          <ControlBtn
            onClick={toggleVideo}
            active={videoOff}
            activeClass="bg-slate-600/90 ring-2 ring-slate-500/40"
            baseClass="bg-black/50 backdrop-blur-sm"
            label={videoOff ? "Show cam" : "Hide cam"}
          >
            {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </ControlBtn>
        </div>

        <style>{`
          @keyframes waveRing {
            0%   { transform: scale(0.8); opacity: 0.4; }
            100% { transform: scale(1.4); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AUDIO CALL LAYOUT
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">

      {/* Hidden audio element — remote stream ONLY (no local = no echo) */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
      />

      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-2xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(30,41,59,0.96) 0%, rgba(15,23,42,0.99) 100%)",
        }}
      />

      {/* Animated rings when active */}
      {callState === "active" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-emerald-400/10"
              style={{
                width:  200 + i * 90,
                height: 200 + i * 90,
                animation: `waveRing 2.5s ease-out ${i * 0.5}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        className="relative z-10 flex flex-col items-center gap-7"
        style={{ animation: "fadeUp 0.4s ease-out forwards" }}
      >
        {/* Avatar */}
        <div className="relative">
          <div className={`absolute inset-[-12px] rounded-full ${
            callState === "active"
              ? "border-2 border-emerald-400/30 animate-pulse"
              : "border-2 border-slate-500/20"
          }`} />
          <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl">
            {contact?.avatarImage ? (
              <img
                src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                alt={contact.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-slate-600 flex items-center justify-center text-white text-3xl font-bold">
                {contact?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name + status */}
        <div className="text-center">
          {callState === "ringing" && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-medium mb-2">
              <PhoneCall size={13} className="animate-bounce" />
              <span>Calling…</span>
            </div>
          )}
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {contact?.username}
          </h2>
          <p className={`text-sm mt-1.5 font-medium tabular-nums ${statusColor}`}>
            {statusLabel}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-5 mt-2">
          <button onClick={toggleMute} className="flex flex-col items-center gap-2">
            <span className={`
              flex h-14 w-14 items-center justify-center rounded-full
              transition-all duration-200 hover:scale-110 active:scale-95
              ${muted
                ? "bg-slate-600/80 text-slate-300 ring-2 ring-slate-500/40"
                : "bg-white/10 text-white hover:bg-white/20"
              }
            `}>
              {muted ? <MicOff size={22} /> : <Mic size={22} />}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {muted ? "Unmute" : "Mute"}
            </span>
          </button>

          {/* End call */}
          <button onClick={onHangup} className="flex flex-col items-center gap-2">
            <span className="
              flex h-16 w-16 items-center justify-center rounded-full rotate-[135deg]
              bg-red-500 text-white shadow-2xl shadow-red-500/50
              transition-all duration-200 hover:bg-red-400 hover:scale-110 active:scale-95
            ">
              <Phone size={24} />
            </span>
            <span className="text-xs font-medium text-slate-400">End</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes waveRing {
          0%   { transform: scale(0.8); opacity: 0.4; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Reusable control button ───────────────────────────────────────────────────
function ControlBtn({ onClick, active, activeClass, baseClass, label, children }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span className={`
        flex h-14 w-14 items-center justify-center rounded-full text-white
        transition-all duration-200 hover:scale-110 active:scale-95
        ${active ? activeClass : baseClass}
      `}>
        {children}
      </span>
      <span className="text-xs text-white/70 font-medium">{label}</span>
    </button>
  );
}
