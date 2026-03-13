// ChatInput.jsx
import React, { useState, useRef, useEffect } from "react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
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

  // Emoji selection
  const onEmojiClick = (emojiData, event) => {
    setMsg((prev) => prev + (emojiData?.emoji || ""));
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

      {/* Input bar */}
      <div
        className="
        bg-white/70 backdrop-blur-2xl
        border border-slate-200/70 rounded-full
        shadow-lg shadow-slate-400/20
        flex items-center gap-2 px-4 py-3
        transition-all duration-200
        focus-within:shadow-xl focus-within:shadow-slate-400/30
        focus-within:bg-white/80
      "
      >
        {/* Emoji button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="p-2.5 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-all duration-200"
        >
          <Smile
            size={22}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          />
        </button>

        {/* Attachment button */}
        <button
          type="button"
          disabled
          className="p-2.5 rounded-full hover:bg-slate-100 transition-all duration-200"
        >
          <Paperclip size={22} className="text-slate-400" />
        </button>

        {/* Message input */}
        <form onSubmit={sendChat} className="flex-1 flex items-center min-w-0">
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message..."
            className="
            flex-1 bg-transparent outline-none
            text-slate-800 placeholder-slate-400
            text-base min-w-0 caret-slate-600
          "
          />
        </form>

        {/* Send button */}
        <button
          type="button"
          onClick={sendChat}
          disabled={!isActive}
          className={`
            p-3 rounded-full transition-all duration-300
            flex items-center justify-center
            ${isActive
              ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg hover:scale-105"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"}
          `}
        >
          <Send size={20} />
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="
          absolute bottom-20 left-0 z-50
          shadow-2xl rounded-2xl
          border border-slate-200
        "
        >
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            emojiStyle={EmojiStyle.NATIVE}
            theme={Theme.LIGHT}
            height={350}
            width={320}
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
          />
        </div>
      )}
    </div>
  );
}