// components/CallButton.jsx
// Shows audio + video call buttons in the ChatContainer header.
// Only renders if the contact has uploaded their public key (= they've set up E2E).

import React, { useState } from "react";
import { Phone, Video, Loader2 } from "lucide-react";

export default function CallButton({ contact, onCall, darkMode, disabled = false }) {
  const [calling, setCalling] = useState(null); // null | "audio" | "video"

  // Hide entirely if contact hasn't generated a key pair yet
  if (!contact?.publicKey) return null;

  const handleClick = async (callType) => {
    if (calling || disabled) return;
    setCalling(callType);
    try {
      await onCall({ contact, callType });
    } finally {
      setCalling(null);
    }
  };

  const dm = darkMode;

  const BtnBase = `
    flex h-9 w-9 items-center justify-center rounded-full
    transition-all duration-200 hover:scale-110 active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `;

  return (
    <div className="flex items-center gap-1.5">
      {/* Audio call */}
      <button
        onClick={() => handleClick("audio")}
        disabled={!!calling || disabled}
        title={calling === "audio" ? "Calling…" : `Audio call ${contact?.username}`}
        className={`${BtnBase} ${
          dm
            ? "bg-slate-700 text-slate-300 hover:bg-emerald-700 hover:text-emerald-300"
            : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
        }`}
      >
        {calling === "audio"
          ? <Loader2 size={16} className="animate-spin" />
          : <Phone size={16} />
        }
      </button>

      {/* Video call */}
      <button
        onClick={() => handleClick("video")}
        disabled={!!calling || disabled}
        title={calling === "video" ? "Calling…" : `Video call ${contact?.username}`}
        className={`${BtnBase} ${
          dm
            ? "bg-slate-700 text-slate-300 hover:bg-indigo-700 hover:text-indigo-300"
            : "bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
        }`}
      >
        {calling === "video"
          ? <Loader2 size={16} className="animate-spin" />
          : <Video size={16} />
        }
      </button>
    </div>
  );
}
