// components/MediaMessage.jsx
// Renders a decrypted media message in the chat bubble.
// Handles: image, video, audio (voice), document
// Decryption happens lazily on first render using the AES key from the message.

import React, { useEffect, useRef, useState } from "react";
import { FileText, Download, Play, Pause, Loader2, AlertCircle } from "lucide-react";
import { fetchAndDecrypt } from "../utils/cryptoMedia";

// ── Format helpers ────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ── Image bubble ──────────────────────────────────────────────────────────────
function ImageBubble({ objectUrl, isSent, darkMode }) {
  const [open, setOpen] = useState(false);
  const dm = darkMode;

  return (
    <>
      <img
        src={objectUrl}
        alt="Image"
        className="max-w-[240px] max-h-[300px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setOpen(true)}
      />
      {/* Full-screen lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer"
          onClick={() => setOpen(false)}
        >
          <img
            src={objectUrl}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-light"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
          {/* Download */}
          <a
            href={objectUrl}
            download="image"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-all"
          >
            <Download size={15} /> Save Image
          </a>
        </div>
      )}
    </>
  );
}

// ── Video bubble ──────────────────────────────────────────────────────────────
function VideoBubble({ objectUrl }) {
  return (
    <video
      src={objectUrl}
      controls
      className="max-w-[280px] rounded-xl"
      style={{ maxHeight: 300 }}
      preload="metadata"
    />
  );
}

// ── Audio / voice bubble ──────────────────────────────────────────────────────
function AudioBubble({ objectUrl, isSent, darkMode, fileName }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const dm = darkMode;
  const isVoice = fileName?.startsWith("voice_");

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  return (
    <div className={`flex items-center gap-3 px-1 py-1 min-w-[200px]`}>
      <audio
        ref={audioRef}
        src={objectUrl}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
      />

      {/* Play/pause button */}
      <button
        onClick={toggle}
        className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-105 ${
          isSent
            ? "bg-white/20 hover:bg-white/30 text-white"
            : dm
              ? "bg-slate-600 hover:bg-slate-500 text-slate-200"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
        }`}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* Waveform bar + time */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Progress bar */}
        <div
          className={`h-1.5 rounded-full cursor-pointer ${
            isSent ? "bg-white/20" : dm ? "bg-slate-600" : "bg-slate-200"
          }`}
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = ratio * duration;
          }}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isSent ? "bg-white" : dm ? "bg-indigo-400" : "bg-indigo-600"
            }`}
            style={{ width: duration ? `${(current / duration) * 100}%` : "0%" }}
          />
        </div>
        <span className={`text-[10px] tabular-nums ${
          isSent ? "text-white/60" : dm ? "text-slate-500" : "text-slate-400"
        }`}>
          {duration > 0 ? formatDuration(duration) : ""}
          {isVoice ? " 🎤" : ""}
        </span>
      </div>
    </div>
  );
}

// ── Document bubble ───────────────────────────────────────────────────────────
function DocumentBubble({ objectUrl, fileName, fileSize, isSent, darkMode }) {
  const dm = darkMode;
  // Derive a nice extension label
  const ext = fileName?.split(".").pop()?.toUpperCase() || "FILE";

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[200px] max-w-[260px]">
      <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-[10px] font-bold ${
        isSent ? "bg-white/20 text-white" : dm ? "bg-slate-600 text-slate-300" : "bg-slate-200 text-slate-600"
      }`}>
        {ext.slice(0, 4)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isSent ? "text-white" : dm ? "text-slate-200" : "text-slate-800"}`}>
          {fileName}
        </p>
        <p className={`text-[10px] mt-0.5 ${isSent ? "text-white/60" : dm ? "text-slate-500" : "text-slate-400"}`}>
          {formatBytes(fileSize)}
        </p>
      </div>
      <a
        href={objectUrl}
        download={fileName}
        className={`flex-shrink-0 p-1.5 rounded-full transition-all hover:scale-110 ${
          isSent ? "bg-white/20 text-white hover:bg-white/30"
                 : dm ? "bg-slate-600 text-slate-300 hover:bg-slate-500"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
        }`}
        title="Download"
      >
        <Download size={14} />
      </a>
    </div>
  );
}

// ── Main MediaMessage ─────────────────────────────────────────────────────────
export default function MediaMessage({ msg, isSent, darkMode }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const urlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const decrypt = async () => {
      try {
        const url = await fetchAndDecrypt(
          msg.media.url,
          msg.media.wrappedKey,
          msg.media.mimeType
        );
        if (!cancelled) {
          urlRef.current = url;
          setObjectUrl(url);
          setStatus("ready");
        }
      } catch (err) {
        console.error("[MediaMessage] Decrypt failed:", err);
        if (!cancelled) setStatus("error");
      }
    };

    decrypt();

    return () => {
      cancelled = true;
      // Revoke the Object URL when component unmounts to free memory
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [msg.media.url, msg.media.wrappedKey, msg.media.mimeType]);

  const dm = darkMode;
  const { mimeType, fileName, fileSize } = msg.media;

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 py-2 px-1">
        <Loader2 size={16} className={`animate-spin ${isSent ? "text-white/70" : dm ? "text-slate-400" : "text-slate-500"}`} />
        <span className={`text-xs ${isSent ? "text-white/70" : dm ? "text-slate-400" : "text-slate-500"}`}>
          Decrypting…
        </span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 py-1 px-1">
        <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
        <span className={`text-xs ${isSent ? "text-white/70" : dm ? "text-slate-400" : "text-slate-400"}`}>
          Failed to decrypt media
        </span>
      </div>
    );
  }

  switch (msg.messageType) {
    case "image":
      return <ImageBubble objectUrl={objectUrl} isSent={isSent} darkMode={dm} />;
    case "video":
      return <VideoBubble objectUrl={objectUrl} isSent={isSent} darkMode={dm} />;
    case "audio":
      return (
        <AudioBubble
          objectUrl={objectUrl}
          isSent={isSent}
          darkMode={dm}
          fileName={fileName}
        />
      );
    default:
      return (
        <DocumentBubble
          objectUrl={objectUrl}
          fileName={fileName}
          fileSize={fileSize}
          isSent={isSent}
          darkMode={dm}
        />
      );
  }
}
