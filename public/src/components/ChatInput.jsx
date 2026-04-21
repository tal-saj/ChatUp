// ChatInput.jsx
// Enhanced with:
//   • Paperclip → file picker (images, videos, documents, audio files)
//   • Mic button → hold-to-record voice message (MediaRecorder)
//   • All uploads are AES-GCM encrypted client-side before sending to server
import React, { useState, useRef, useEffect, useCallback } from "react";
import EmojiPicker from "emoji-picker-react";
import { Smile, Send, Paperclip, Mic, MicOff, X, FileText, Image, Film } from "lucide-react";
import { encryptFile } from "../utils/cryptoMedia";
import { uploadMediaRoute, sendMediaMessageRoute } from "../utils/APIRoutes";
import api from "../utils/axiosConfig";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMessageType(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

// ── MediaPreview (shown before send) ─────────────────────────────────────────
function MediaPreview({ file, onRemove, darkMode }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const dm = darkMode;

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isImage = file?.type.startsWith("image/");
  const isVideo = file?.type.startsWith("video/");
  const isAudio = file?.type.startsWith("audio/");

  return (
    <div className={`relative flex items-center gap-3 p-3 rounded-xl border mb-2 ${
      dm ? "bg-slate-700/60 border-slate-600/50" : "bg-slate-50 border-slate-200"
    }`}>
      {/* Thumbnail */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center ${
        dm ? "bg-slate-600" : "bg-slate-200"
      }`}>
        {isImage && previewUrl && (
          <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
        )}
        {isVideo && <Film size={22} className={dm ? "text-indigo-400" : "text-indigo-600"} />}
        {isAudio && <Mic size={22} className={dm ? "text-emerald-400" : "text-emerald-600"} />}
        {!isImage && !isVideo && !isAudio && (
          <FileText size={22} className={dm ? "text-slate-400" : "text-slate-500"} />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${dm ? "text-slate-200" : "text-slate-800"}`}>
          {file?.name}
        </p>
        <p className={`text-[10px] mt-0.5 ${dm ? "text-slate-500" : "text-slate-400"}`}>
          {formatBytes(file?.size || 0)}
        </p>
        {isAudio && previewUrl && (
          <audio src={previewUrl} controls className="mt-1 h-6 w-full max-w-[200px]" />
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className={`flex-shrink-0 p-1 rounded-full transition-all hover:scale-110 ${
          dm ? "bg-slate-600 text-slate-300 hover:bg-red-800 hover:text-red-300"
             : "bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-500"
        }`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── VoiceRecordButton ─────────────────────────────────────────────────────────
// Hold mic button to record; release to attach the voice message.
function VoiceRecordButton({ onRecorded, darkMode, disabled }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const dm = darkMode;

  const startRecording = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });
        onRecorded(file);
        setDuration(0);
      };
      recorderRef.current = recorder;
      recorder.start(100);
      setRecording(true);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      alert("Microphone access denied.");
    }
  }, [disabled, onRecorded]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  // Touch support for mobile hold-to-record
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onMouseLeave={stopRecording}
      onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
      onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
      title={recording ? `Recording… ${duration}s` : "Hold to record voice message"}
      className={`
        p-2 rounded-full flex-shrink-0 transition-all duration-150 select-none
        ${recording
          ? "bg-red-500 text-white scale-110 animate-pulse"
          : dm
            ? "text-slate-400 hover:text-emerald-300 hover:bg-slate-600"
            : "text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
        }
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
    >
      {recording ? (
        <span className="flex items-center gap-1">
          <MicOff size={18} />
        </span>
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
}

// ── Main ChatInput ────────────────────────────────────────────────────────────
export default function ChatInput({
  handleSendMsg,
  handleSendMedia, // async (file) => void  — provided by ChatContainer
  darkMode,
}) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickerRef  = useRef(null);
  const buttonRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);

  const dm = darkMode;

  // Close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleEmojiClick = (emojiData) => {
    setMsg((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const sendChat = (e) => {
    e?.preventDefault();
    if (msg.trim().length > 0) {
      handleSendMsg(msg.trim());
      setMsg("");
      setShowEmojiPicker(false);
    }
  };

  // File picked from disk
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 50 MB limit
    if (file.size > 50 * 1024 * 1024) {
      alert("File too large. Maximum size is 50 MB.");
      return;
    }
    setPendingFile(file);
    e.target.value = "";
  };

  // Voice message recorded
  const handleVoiceRecorded = (file) => {
    setPendingFile(file);
  };

  // Send the pending media file
  const sendMedia = async () => {
    if (!pendingFile || uploading) return;
    setUploading(true);
    try {
      await handleSendMedia(pendingFile);
      setPendingFile(null);
    } catch (err) {
      console.error("Media send failed:", err);
      alert("Failed to send file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isTextActive = msg.trim().length > 0;
  const canSend = !uploading && (isTextActive || pendingFile);

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
            theme={dm ? "dark" : "light"}
            height={350}
            width={300}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Media preview above input */}
      {pendingFile && (
        <MediaPreview
          file={pendingFile}
          onRemove={() => setPendingFile(null)}
          darkMode={dm}
        />
      )}

      {/* Input bar */}
      <div className={`
        flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition-colors duration-200
        ${dm
          ? "bg-slate-700/80 border-slate-600/60 focus-within:border-slate-500"
          : "bg-white/70 backdrop-blur-xl border-slate-200/70 focus-within:border-slate-300 shadow-sm"
        }
      `}>
        {/* Emoji */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className={`p-2 rounded-full flex-shrink-0 transition-all duration-150 hover:scale-110 active:scale-95 ${
            showEmojiPicker
              ? dm ? "bg-slate-600 text-yellow-400" : "bg-slate-100 text-slate-700"
              : dm ? "text-slate-400 hover:text-slate-200 hover:bg-slate-600"
                   : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
          title="Emoji"
          disabled={uploading}
        >
          <Smile size={20} />
        </button>

        {/* Attachment */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !!pendingFile}
          title="Attach file"
          className={`p-2 rounded-full flex-shrink-0 transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
            dm ? "text-slate-400 hover:text-indigo-300 hover:bg-slate-600"
               : "text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
          }`}
        >
          <Paperclip size={18} />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={msg}
          placeholder={pendingFile ? "Add a caption…" : "Type a message…"}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (pendingFile) sendMedia();
              else if (isTextActive) sendChat(e);
            }
          }}
          disabled={uploading}
          className={`
            flex-1 bg-transparent outline-none text-sm min-w-0
            ${dm ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"}
            disabled:opacity-60
          `}
        />

        {/* Voice record (only when no pending file) */}
        {!pendingFile && (
          <VoiceRecordButton
            onRecorded={handleVoiceRecorded}
            darkMode={dm}
            disabled={uploading}
          />
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={pendingFile ? sendMedia : sendChat}
          disabled={!canSend}
          className={`
            p-2.5 rounded-full flex-shrink-0 transition-all duration-150 relative
            ${canSend
              ? dm
                ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95"
                : "bg-slate-900 text-white hover:bg-slate-700 hover:scale-105 active:scale-95"
              : dm
                ? "bg-slate-600/50 text-slate-500 cursor-not-allowed"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            }
          `}
        >
          {uploading ? (
            <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
