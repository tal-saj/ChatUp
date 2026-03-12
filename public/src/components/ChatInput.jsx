// ChatInput.jsx
import React, { useState, useRef, useEffect } from "react";
import Picker from "emoji-picker-react";
import { EmojiStyle, Theme } from "emoji-picker-react";
import { Smile, Paperclip, Send } from "lucide-react";

export default function ChatInput({ handleSendMsg }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onEmojiClick = (emojiData) => {
    setMsg((prev) => prev + emojiData.emoji);
    // Keeping picker open after selection (common UX choice)
  };

  const sendChat = (e) => {
    e.preventDefault();
    const trimmed = msg.trim();
    if (!trimmed) return;

    handleSendMsg(trimmed);
    setMsg("");
    setShowEmojiPicker(false);
  };

  const isActive = msg.trim().length > 0;

  return (
    <div className="relative px-3 pb-4 pt-2 bg-transparent">
      {/* Glassmorphic input bar */}
      <div
        className={`
          mx-auto max-w-3xl
          bg-white/70 backdrop-blur-2xl 
          border border-slate-200/70 rounded-full 
          shadow-lg shadow-slate-400/20
          flex items-center gap-2 px-4 py-3
          transition-all duration-200
          focus-within:shadow-xl focus-within:shadow-slate-400/30
          focus-within:bg-white/80
        `}
      >
        {/* Emoji button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className="
            p-2.5 rounded-full 
            hover:bg-slate-100 active:bg-slate-200 
            transition-all duration-200 flex-shrink-0
          "
          aria-label="Open emoji picker"
        >
          <Smile 
            size={22} 
            className="text-slate-500 hover:text-slate-700 transition-colors" 
          />
        </button>

        {/* Attachment button (placeholder) */}
        <button
          type="button"
          className="
            p-2.5 rounded-full 
            hover:bg-slate-100 active:bg-slate-200 
            transition-all duration-200 flex-shrink-0
          "
          aria-label="Attach file (coming soon)"
          disabled
        >
          <Paperclip 
            size={22} 
            className="text-slate-400" 
          />
        </button>

        {/* Message input */}
        <form onSubmit={sendChat} className="flex-1 flex items-center min-w-0">
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat(e);
              }
            }}
            placeholder="Type a message..."
            className="
              flex-1 bg-transparent outline-none 
              text-slate-800 placeholder-slate-400 
              text-base min-w-0
              caret-slate-600
            "
            aria-label="Type your message"
          />
        </form>

        {/* Send button */}
        <button
          type="button"
          onClick={sendChat}
          disabled={!isActive}
          className={`
            p-3 rounded-full transition-all duration-300 flex items-center justify-center flex-shrink-0
            transform active:scale-95
            ${
              isActive
                ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-500/30 hover:shadow-xl hover:shadow-slate-600/40 hover:brightness-110 hover:scale-105"
                : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-70"
            }
          `}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Emoji Picker – light theme, positioned above */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="
            absolute bottom-full left-4 right-4 mb-4 
            mx-auto max-w-md 
            z-50 
            shadow-2xl shadow-slate-400/30
            rounded-2xl overflow-hidden
            border border-slate-200/60
          "
        >
          <Picker
            onEmojiClick={onEmojiClick}
            emojiStyle={EmojiStyle.NATIVE}
            theme={Theme.LIGHT}           // ← important for light mode
            height={360}
            width="100%"
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
            searchDisabled={false}
            lazyLoadEmojis={true}
          />
        </div>
      )}
    </div>
  );
}