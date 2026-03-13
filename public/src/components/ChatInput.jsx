import React, { useState, useRef, useEffect } from "react";
import Picker from "emoji-picker-react";
import { Smile, Paperclip, Send } from "lucide-react";

export default function ChatInput({ handleSendMsg }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // toggle emoji picker
  const handleEmojiPickerhideShow = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  // emoji click (stable version)
  const handleEmojiClick = (event, emojiObject) => {
    let message = msg;
    message += emojiObject.emoji;
    setMsg(message);
  };

  // close picker when clicking outside
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
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sendChat = (e) => {
    e.preventDefault();

    if (msg.trim().length > 0) {
      handleSendMsg(msg);
      setMsg("");
      setShowEmojiPicker(false);
    }
  };

  const isActive = msg.trim().length > 0;

  return (
    <div className="relative px-3 pb-4 pt-2">

      {/* Input Bar */}
      <div
        className="
        bg-white/70 backdrop-blur-2xl
        border border-slate-200/70 rounded-full
        shadow-lg
        flex items-center gap-2 px-4 py-3
      "
      >
        {/* Emoji Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleEmojiPickerhideShow}
          className="p-2.5 rounded-full hover:bg-slate-100 transition"
        >
          <Smile size={22} className="text-slate-600" />
        </button>

        {/* Attachment */}
        <button
          type="button"
          disabled
          className="p-2.5 rounded-full hover:bg-slate-100 transition"
        >
          <Paperclip size={22} className="text-slate-400" />
        </button>

        {/* Input */}
        <form
          onSubmit={sendChat}
          className="flex-1 flex items-center min-w-0"
        >
          <input
            type="text"
            value={msg}
            placeholder="Type a message..."
            onChange={(e) => setMsg(e.target.value)}
            className="
            flex-1 bg-transparent outline-none
            text-slate-800 placeholder-slate-400
            text-base min-w-0
          "
          />
        </form>

        {/* Send Button */}
        <button
          type="button"
          onClick={sendChat}
          disabled={!isActive}
          className={`
            p-3 rounded-full transition-all
            ${
              isActive
                ? "bg-slate-900 text-white hover:scale-105"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }
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
          absolute bottom-20 left-2
          z-50
          shadow-2xl
        "
        >
          <Picker
            onEmojiClick={handleEmojiClick}
          />
        </div>
      )}
    </div>
  );
}