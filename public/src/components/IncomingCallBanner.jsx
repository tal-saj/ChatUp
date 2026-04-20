// components/IncomingCallBanner.jsx
// Edge cases handled:
//   • call-on-call: banner hidden by parent when callActive=true
//   • caller cancels before answer: status poll detects "ended"/"missed" → dismiss
//   • reject: posts end to server so caller gets "rejected" status
//   • network hiccup: poll catches up when reconnected
//   • multiple rapid incoming calls: activeRef prevents stacking

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Phone, PhoneOff, PhoneIncoming, Video } from "lucide-react";
import api from "../utils/axiosConfig";
import { callIncomingRoute, callStatusRoute } from "../utils/APIRoutes";

const POLL_MS        = 2_000;
const STATUS_POLL_MS = 2_000;

export default function IncomingCallBanner({ onAccept, onReject, darkMode }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const pollRef       = useRef(null);
  const statusPollRef = useRef(null);
  const audioCtxRef   = useRef(null);
  const ringtoneRef   = useRef(null);
  const activeRef     = useRef(false);

  // ── Ringtone ─────────────────────────────────────────────────────────────────
  const startRingtone = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const play = () => {
        if (!audioCtxRef.current) return;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      };
      play();
      ringtoneRef.current = setInterval(play, 1_800);
    } catch { /* silent fallback */ }
  }, []);

  const stopRingtone = useCallback(() => {
    clearInterval(ringtoneRef.current);
    ringtoneRef.current = null;
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    audioCtxRef.current = null;
  }, []);

  // ── Dismiss (no server call — used when call disappears on its own) ──────────
  const dismiss = useCallback(() => {
    stopRingtone();
    clearInterval(statusPollRef.current);
    statusPollRef.current = null;
    setIncomingCall(null);
    activeRef.current = false;
  }, [stopRingtone]);

  // ── Poll status of the displayed call ────────────────────────────────────────
  // Catches: caller hung up, call expired, caller started another call
  const startStatusPolling = useCallback((callId) => {
    clearInterval(statusPollRef.current);
    statusPollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`${callStatusRoute}/${callId}`);
        if (["ended", "rejected", "missed"].includes(data.status)) dismiss();
      } catch {
        // 404 = call doc gone (TTL expired or caller cancelled) → dismiss
        dismiss();
      }
    }, STATUS_POLL_MS);
  }, [dismiss]);

  // ── Poll for new incoming calls ──────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (activeRef.current) return;
    try {
      const { data } = await api.get(callIncomingRoute);
      if (data?.callId) {
        activeRef.current = true;
        setIncomingCall(data);
        startRingtone();
        startStatusPolling(data.callId);
      }
    } catch { /* silent */ }
  }, [startRingtone, startStatusPolling]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(statusPollRef.current);
      stopRingtone();
    };
  }, [poll, stopRingtone]);

  // ── Accept ───────────────────────────────────────────────────────────────────
  const handleAccept = () => {
    stopRingtone();
    clearInterval(statusPollRef.current);
    const call = incomingCall;
    setIncomingCall(null);
    activeRef.current = false;
    onAccept(call);
  };

  // ── Reject ───────────────────────────────────────────────────────────────────
  const handleReject = () => {
    const call = incomingCall;
    dismiss();
    onReject(call); // parent calls rejectCall(callId) which posts "rejected" to server
  };

  if (!incomingCall) return null;

  const dm = darkMode;
  const isVideo = incomingCall.callType === "video";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-xl"
        style={{ background: dm ? "rgba(15,23,42,0.88)" : "rgba(15,23,42,0.78)" }}
      />

      {/* Card */}
      <div
        className={`
          relative z-10 flex flex-col items-center gap-6
          px-10 py-10 rounded-3xl shadow-2xl border
          ${dm ? "bg-slate-800/92 border-slate-700/60" : "bg-white/92 border-slate-200/80"}
        `}
        style={{
          animation: "callCardIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
          minWidth: 300,
        }}
      >
        {/* Pulsing avatar */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="absolute inset-[-8px] rounded-full border-2 border-emerald-400/40 animate-pulse" />
          <div className="h-20 w-20 rounded-full overflow-hidden ring-4 ring-emerald-400/60 ring-offset-4 ring-offset-transparent">
            {incomingCall.caller?.avatarImage ? (
              <img
                src={`data:image/svg+xml;base64,${incomingCall.caller.avatarImage}`}
                alt={incomingCall.caller.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-slate-600 flex items-center justify-center text-white text-2xl font-bold">
                {incomingCall.caller?.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Labels */}
        <div className="text-center">
          <div className={`flex items-center justify-center gap-2 text-xs font-medium mb-1.5 ${
            dm ? "text-emerald-400" : "text-emerald-600"
          }`}>
            {isVideo
              ? <Video size={13} />
              : <PhoneIncoming size={13} />
            }
            <span>Incoming {isVideo ? "Video" : "Audio"} Call</span>
          </div>
          <h2 className={`text-2xl font-bold tracking-tight ${dm ? "text-slate-100" : "text-slate-900"}`}>
            {incomingCall.caller?.username}
          </h2>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-6 mt-2">
          <button onClick={handleReject} className="flex flex-col items-center gap-2">
            <span className="
              flex h-14 w-14 items-center justify-center rounded-full
              bg-red-500 text-white shadow-lg shadow-red-500/40
              transition-all duration-200 hover:bg-red-400 hover:scale-110 active:scale-95
            ">
              <PhoneOff size={22} />
            </span>
            <span className={`text-xs font-medium ${dm ? "text-slate-400" : "text-slate-500"}`}>Decline</span>
          </button>

          <button onClick={handleAccept} className="flex flex-col items-center gap-2">
            <span className="
              flex h-14 w-14 items-center justify-center rounded-full
              bg-emerald-500 text-white shadow-lg shadow-emerald-500/40
              transition-all duration-200 hover:bg-emerald-400 hover:scale-110 active:scale-95
            ">
              {isVideo ? <Video size={22} /> : <Phone size={22} />}
            </span>
            <span className={`text-xs font-medium ${dm ? "text-slate-400" : "text-slate-500"}`}>Accept</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes callCardIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
