// ChatInput.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import EmojiPicker from "emoji-picker-react";
import { Smile, Send, Mic, Square, Loader2 } from "lucide-react";

export default function ChatInput({ handleSendMsg, handleSendVoice, darkMode }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSendingVoice, setIsSendingVoice] = useState(false);

  const pickerRef    = useRef(null);
  const buttonRef    = useRef(null);
  const inputRef     = useRef(null);
  const mediaRecRef  = useRef(null);   // MediaRecorder instance
  const chunksRef    = useRef([]);     // recorded audio chunks
  const timerRef     = useRef(null);   // recording duration counter
  const streamRef    = useRef(null);   // mic MediaStream (to stop tracks on cleanup)

  // ── Close emoji picker on outside click ────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleEmojiClick = (emojiData) => {
    setMsg((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (msg.trim().length > 0) {
      handleSendMsg(msg.trim());
      setMsg("");
      setShowEmojiPicker(false);
    }
  };

  // ── Voice: start recording ─────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Pick best supported format
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"]
        .find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });

        if (blob.size > 0 && handleSendVoice) {
          setIsSendingVoice(true);
          try {
            await handleSendVoice(blob);
          } finally {
            setIsSendingVoice(false);
          }
        }
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      // Request data every 250ms so we accumulate chunks continuously
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert("Microphone access denied or unavailable.");
    }
  }, [isRecording, handleSendVoice]);

  // ── Voice: stop & send recording ──────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
  }, []);

  // ── Voice: cancel recording (discard) ─────────────────────────────────────
  const cancelRecording = useCallback(() => {
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      // Override onstop so it doesn't send
      mediaRecRef.current.onstop = () => {
        clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsRecording(false);
        setRecordingSeconds(0);
        chunksRef.current = [];
      };
      mediaRecRef.current.stop();
    }
  }, []);

  const fmtTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  const isActive = msg.trim().length > 0;
  const dm = darkMode;

  // ── Recording UI ───────────────────────────────────────────────────────────
  if (isRecording) {
    return (
      <div className={`
        flex items-center gap-3 px-3 py-2 rounded-2xl border
        ${dm
          ? "bg-slate-700/80 border-red-500/40"
          : "bg-white/70 backdrop-blur-xl border-red-300/60 shadow-sm"
        }
      `}>
        {/* Pulsing dot */}
        <span className="flex-shrink-0 h-3 w-3 rounded-full bg-red-500 animate-pulse" />

        {/* Timer */}
        <span className={`flex-1 text-sm font-mono font-medium tabular-nums ${
          dm ? "text-red-400" : "text-red-600"
        }`}>
          Recording {fmtTime(recordingSeconds)}
        </span>

        {/* Cancel */}
        <button
          type="button"
          onClick={cancelRecording}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
            dm
              ? "bg-slate-600 text-slate-300 hover:bg-slate-500"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Cancel
        </button>

        {/* Stop & Send */}
        <button
          type="button"
          onClick={stopRecording}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-400 transition-all hover:scale-105 active:scale-95"
        >
          <Square size={12} className="fill-current" />
          Send
        </button>
      </div>
    );
  }

  if (isSendingVoice) {
    return (
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl border
        ${dm ? "bg-slate-700/80 border-slate-600/60" : "bg-white/70 border-slate-200/70 shadow-sm"}
      `}>
        <Loader2 size={16} className={`animate-spin ${dm ? "text-indigo-400" : "text-indigo-600"}`} />
        <span className={`text-sm ${dm ? "text-slate-400" : "text-slate-500"}`}>Sending voice…</span>
      </div>
    );
  }

  // ── Normal text input UI ───────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Emoji Picker — opens upward */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full mb-2 left-0 z-50 shadow-2xl rounded-xl overflow-hidden"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={dm ? "dark" : "light"}
            height={320}
            width={Math.min(300, window.innerWidth - 32)}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input bar */}
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-2xl border transition-colors duration-200
        ${dm
          ? "bg-slate-700/80 border-slate-600/60 focus-within:border-slate-500"
          : "bg-white/70 backdrop-blur-xl border-slate-200/70 focus-within:border-slate-300 shadow-sm"
        }
      `}>
        {/* Emoji button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className={`p-2 rounded-full flex-shrink-0 transition-all duration-150 hover:scale-110 active:scale-95 ${
            showEmojiPicker
              ? dm ? "bg-slate-600 text-yellow-400" : "bg-slate-100 text-slate-700"
              : dm ? "text-slate-400 hover:text-slate-200 hover:bg-slate-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
          title="Emoji"
          aria-label="Open emoji picker"
        >
          <Smile size={20} />
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={msg}
          placeholder="Type a message…"
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (isActive) sendChat(e);
            }
          }}
          className={`
            flex-1 bg-transparent outline-none text-sm min-w-0
            ${dm ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}
          `}
        />

        {/* Voice button (shown when no text typed) */}
        {!isActive && (
          <button
            type="button"
            onClick={startRecording}
            className={`p-2.5 rounded-full flex-shrink-0 transition-all duration-150 hover:scale-110 active:scale-95 ${
              dm
                ? "bg-slate-600/70 text-slate-300 hover:bg-slate-500 hover:text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            }`}
            title="Voice message"
            aria-label="Record voice message"
          >
            <Mic size={18} />
          </button>
        )}

        {/* Send button (shown when text is typed) */}
        {isActive && (
          <button
            type="button"
            onClick={sendChat}
            className={`
              p-2.5 rounded-full flex-shrink-0 transition-all duration-150
              ${dm
                ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95"
                : "bg-slate-900 text-white hover:bg-slate-700 hover:scale-105 active:scale-95"
              }
            `}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
