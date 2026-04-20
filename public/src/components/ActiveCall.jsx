// components/ActiveCall.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Phone, Mic, MicOff } from "lucide-react";

export default function ActiveCall({
  contact,
  callType = "audio",
  remoteStream,       // MediaStream passed from Chat.jsx
  onHangup,
  onMuteChange,
  darkMode,
}) {
  const [muted,     setMuted]     = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [callState, setCallState] = useState("connecting");
  const timerRef    = useRef(null);
  const audioElRef  = useRef(null); // <audio> element ref

  // ── Attach remote stream as soon as it arrives (or changes) ─────────────────
  // useLayoutEffect fires synchronously after DOM mutations, before paint.
  // This ensures the <audio> element exists before we try to assign srcObject.
  useLayoutEffect(() => {
    const el = audioElRef.current;
    if (!el || !remoteStream) return;

    // Only reassign if the stream actually changed
    if (el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
    }

    // Autoplay is blocked by browsers unless triggered by user gesture.
    // The user already tapped "Accept" so this .play() is allowed.
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // NotAllowedError: user hasn't interacted enough yet.
        // Retry on next user interaction.
        console.warn("[Audio] play() blocked:", err.message);
        const retry = () => { el.play().catch(() => {}); };
        document.addEventListener("click",     retry, { once: true });
        document.addEventListener("touchstart", retry, { once: true });
      });
    }

    setCallState("active");
  }, [remoteStream]);

  // ── Call timer ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState !== "active") return;
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1_000);
    return () => clearInterval(timerRef.current);
  }, [callState]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      // Detach stream from audio element on unmount to release resources
      if (audioElRef.current) {
        audioElRef.current.srcObject = null;
      }
    };
  }, []);

  const formatTime = (s) => {
    const m   = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    onMuteChange?.(next);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">

      {/* ── Audio element — always rendered, never hidden ───────────────────── */}
      {/* playsInline is critical on iOS to prevent full-screen audio takeover  */}
      <audio
        ref={audioElRef}
        autoPlay
        playsInline
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
      />

      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-2xl"
        style={{
          background: "radial-gradient(ellipse at center, rgba(30,41,59,0.96) 0%, rgba(15,23,42,0.99) 100%)",
        }}
      />

      {/* Animated rings — only when active */}
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

        {/* Name + timer */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {contact?.username}
          </h2>
          <p className={`text-sm mt-1.5 font-medium tabular-nums ${
            callState === "active" ? "text-emerald-400" : "text-slate-400"
          }`}>
            {callState === "active" ? formatTime(elapsed) : "Connecting…"}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-5 mt-2">
          {/* Mute toggle */}
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
