// ChatInput.jsx
import React, { useState, useRef, useEffect } from "react";
import Picker from "emoji-picker-react";
import { EmojiStyle } from "emoji-picker-react";
import { Smile, Paperclip, Send } from "lucide-react";

export default function ChatInput({ handleSendMsg }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // Close picker when clicking outside
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
    // Optional: keep picker open or close → here we keep open
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
      {/* Glassmorphic floating container */}
      <div
        className={`
          mx-auto max-w-3xl
          bg-gray-900/60 backdrop-blur-2xl 
          border border-gray-700/50 rounded-full 
          shadow-2xl shadow-black/40
          flex items-center gap-2 px-4 py-3
          transition-all duration-200
        `}
      >
        {/* Emoji button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className="p-2.5 rounded-full hover:bg-gray-800/60 transition-colors flex-shrink-0"
          aria-label="Open emoji picker"
        >
          <Smile size={22} className="text-yellow-400" />
        </button>

        {/* Attachment placeholder (future: file upload) */}
        <button
          type="button"
          className="p-2.5 rounded-full hover:bg-gray-800/60 transition-colors flex-shrink-0"
          aria-label="Attach file"
        >
          <Paperclip size={22} className="text-gray-400" />
        </button>

        {/* Input */}
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
            placeholder="Message..."
            className="
              flex-1 bg-transparent outline-none 
              text-gray-100 placeholder-gray-500 
              text-base min-w-0
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
            p-3 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0
            ${
              isActive
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105"
                : "bg-gray-800/80 text-gray-500 cursor-not-allowed"
            }
          `}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>

      {/* Emoji Picker – positioned above */}
      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className="
            absolute bottom-full left-4 right-4 mb-4 
            mx-auto max-w-md 
            z-50 shadow-2xl shadow-purple-900/30
            rounded-2xl overflow-hidden
          "
        >
          <Picker
            onEmojiClick={onEmojiClick}
            emojiStyle={EmojiStyle.NATIVE}
            height={360}
            width="100%"
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
            searchDisabled={false}
            // You can add theme="dark" if the library supports it in your version
          />
        </div>
      )}
    </div>
  );
}