// components/CallButton.jsx
// Small phone button that sits in the ChatContainer header.
// Shows a spinner while the call is being initiated.

import React, { useState } from "react";
import { Phone, Loader2 } from "lucide-react";

export default function CallButton({ contact, onCall, darkMode, disabled = false }) {
  const [calling, setCalling] = useState(false);

  // Only show if contact has a public key (means they've logged in and set up E2E)
  if (!contact?.publicKey) return null;

  const handleClick = async () => {
    if (calling || disabled) return;
    setCalling(true);
    try {
      await onCall({ contact, callType: "audio" });
    } finally {
      setCalling(false);
    }
  };

  const dm = darkMode;

  return (
    <button
      onClick={handleClick}
      disabled={calling || disabled}
      title={calling ? "Calling..." : `Call ${contact?.username}`}
      className={`
        flex h-9 w-9 items-center justify-center rounded-full
        transition-all duration-200 hover:scale-110 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${dm
          ? "bg-slate-700 text-slate-300 hover:bg-emerald-700 hover:text-emerald-300"
          : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
        }
      `}
    >
      {calling
        ? <Loader2 size={17} className="animate-spin" />
        : <Phone size={17} />
      }
    </button>
  );
}
