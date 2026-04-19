// components/IncomingCallBanner.jsx
// Mounts once in Chat.jsx and polls every 2s for incoming calls.
// Renders a full-screen blur overlay with Accept / Reject.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Phone, PhoneOff, PhoneIncoming } from "lucide-react";
import api from "../utils/axiosConfig";
import { callIncomingRoute } from "../utils/APIRoutes";

const POLL_MS = 2_000;

export default function IncomingCallBanner({ onAccept, onReject, darkMode }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const pollRef   = useRef(null);
  const audioRef  = useRef(null);
  const activeRef = useRef(false); // are we currently showing a call?

  // Ringtone — created programmatically so no asset needed
  const startRingtone = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = () => {
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
      audioRef.current = setInterval(play, 1_800);
      return ctx;
    } catch { return null; }
  }, []);

  const stopRingtone = useCallback(() => {
    clearInterval(audioRef.current);
    audioRef.current = null;
  }, []);

  const poll = useCallback(async () => {
    // Don't poll if we're already showing a call
    if (activeRef.current) return;
    try {
      const { data } = await api.get(callIncomingRoute);
      if (data?.callId && !activeRef.current) {
        activeRef.current = true;
        setIncomingCall(data);
        startRingtone();
      }
    } catch { /* poll silently */ }
  }, [startRingtone]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => {
      clearInterval(pollRef.current);
      stopRingtone();
    };
  }, [poll, stopRingtone]);

  const handleAccept = () => {
    stopRingtone();
    const call = incomingCall;
    setIncomingCall(null);
    activeRef.current = false;
    onAccept(call);
  };

  const handleReject = async () => {
    stopRingtone();
    const call = incomingCall;
    setIncomingCall(null);
    activeRef.current = false;
    onReject(call);
  };

  if (!incomingCall) return null;

  const dm = darkMode;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-xl"
        style={{ background: dm ? "rgba(15,23,42,0.85)" : "rgba(15,23,42,0.75)" }}
      />

      {/* Card */}
      <div
        className={`
          relative z-10 flex flex-col items-center gap-6
          px-10 py-10 rounded-3xl shadow-2xl
          border transition-all
          ${dm
            ? "bg-slate-800/90 border-slate-700/60"
            : "bg-white/90 border-slate-200/80"
          }
        `}
        style={{
          animation: "callCardIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
          minWidth: 300,
        }}
      >
        {/* Pulsing ring around avatar */}
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
            <PhoneIncoming size={13} />
            <span>Incoming {incomingCall.callType === "video" ? "Video" : "Audio"} Call</span>
          </div>
          <h2 className={`text-2xl font-bold tracking-tight ${dm ? "text-slate-100" : "text-slate-900"}`}>
            {incomingCall.caller?.username}
          </h2>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-6 mt-2">
          {/* Reject */}
          <button
            onClick={handleReject}
            className="flex flex-col items-center gap-2 group"
          >
            <span className="
              flex h-14 w-14 items-center justify-center rounded-full
              bg-red-500 text-white shadow-lg shadow-red-500/40
              transition-all duration-200 hover:bg-red-400 hover:scale-110 active:scale-95
              group-hover:shadow-red-400/50
            ">
              <PhoneOff size={22} />
            </span>
            <span className={`text-xs font-medium ${dm ? "text-slate-400" : "text-slate-500"}`}>Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-2 group"
          >
            <span className="
              flex h-14 w-14 items-center justify-center rounded-full
              bg-emerald-500 text-white shadow-lg shadow-emerald-500/40
              transition-all duration-200 hover:bg-emerald-400 hover:scale-110 active:scale-95
              group-hover:shadow-emerald-400/50
            ">
              <Phone size={22} />
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
