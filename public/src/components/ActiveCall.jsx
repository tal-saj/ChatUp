// components/ActiveCall.jsx
// Minimal, elegant overlay shown while a call is in progress.
// Video-ready: pass localVideoRef / remoteVideoRef for future video calls.

import React, { useEffect, useRef, useState } from "react";
import { Phone, Mic, MicOff } from "lucide-react";

export default function ActiveCall({
  contact,
  callType = "audio",
  remoteStream,
  onHangup,
  onMuteChange,
  darkMode,
}) {
  const [muted,     setMuted]     = useState(false);
  const [elapsed,   setElapsed]   = useState(0);     // seconds
  const [callState, setCallState] = useState("connecting"); // connecting | active
  const timerRef      = useRef(null);
  const remoteAudio   = useRef(null);
  const remoteVideoEl = useRef(null);

  // Attach remote stream to audio/video element
  useEffect(() => {
    if (!remoteStream) return;

    // Audio element always
    if (remoteAudio.current) {
      remoteAudio.current.srcObject = remoteStream;
    }
    // Video element (future use)
    if (remoteVideoEl.current && callType === "video") {
      remoteVideoEl.current.srcObject = remoteStream;
    }

    setCallState("active");
  }, [remoteStream, callType]);

  // Call timer
  useEffect(() => {
    if (callState !== "active") return;
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1_000);
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    onMuteChange?.(next);
  };

  const dm = darkMode;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* Hidden audio element — plays remote audio */}
      <audio ref={remoteAudio} autoPlay playsInline />

      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-2xl"
        style={{
          background: dm
            ? "radial-gradient(ellipse at center, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%)"
            : "radial-gradient(ellipse at center, rgba(30,41,59,0.88) 0%, rgba(15,23,42,0.92) 100%)",
        }}
      />

      {/* Animated sound-wave rings (pure CSS, audio call vibe) */}
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
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {contact?.username}
          </h2>
          <p className={`text-sm mt-1 font-medium ${
            callState === "active" ? "text-emerald-400" : "text-slate-400"
          }`}>
            {callState === "active"
              ? formatTime(elapsed)
              : "Connecting..."}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-5 mt-2">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`
              flex flex-col items-center gap-2 group
            `}
          >
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
          <button
            onClick={onHangup}
            className="flex flex-col items-center gap-2 group"
          >
            <span className="
              flex h-16 w-16 items-center justify-center rounded-full
              bg-red-500 text-white shadow-2xl shadow-red-500/50
              transition-all duration-200 hover:bg-red-400 hover:scale-110 active:scale-95
              rotate-[135deg]
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
