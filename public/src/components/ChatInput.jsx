// ChatInput.jsx
import React, { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { Smile, Send } from "lucide-react";

export default function ChatInput({ handleSendMsg, darkMode }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);

  // Close picker when clicking outside
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

  // Fixed emoji click handler — new emoji-picker-react v4+ passes emojiData as first arg
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

  const isActive = msg.trim().length > 0;

  return (
    <div className="relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="absolute bottom-full mb-2 left-0 z-50 shadow-2xl rounded-xl overflow-hidden"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={darkMode ? "dark" : "light"}
            height={350}
            width={300}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input bar */}
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-2xl border transition-colors duration-200
        ${darkMode
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
              ? darkMode ? "bg-slate-600 text-yellow-400" : "bg-slate-100 text-slate-700"
              : darkMode ? "text-slate-400 hover:text-slate-200 hover:bg-slate-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
          title="Emoji"
        >
          <Smile size={20} />
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={msg}
          placeholder="Type a message..."
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (isActive) sendChat(e);
            }
          }}
          className={`
            flex-1 bg-transparent outline-none text-sm min-w-0
            ${darkMode ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}
          `}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={sendChat}
          disabled={!isActive}
          className={`
            p-2.5 rounded-full flex-shrink-0 transition-all duration-150
            ${isActive
              ? darkMode
                ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95"
                : "bg-slate-900 text-white hover:bg-slate-700 hover:scale-105 active:scale-95"
              : darkMode
                ? "bg-slate-600/50 text-slate-500 cursor-not-allowed"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            }
          `}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
