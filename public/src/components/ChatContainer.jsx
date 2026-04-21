// components/ChatContainer.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatInput from "./ChatInput";
import CallButton from "./CallButton";
import MediaMessage from "./MediaMessage";
import { Lock } from "lucide-react";
import {
  sendMessageRoute,
  sendMediaMessageRoute,
  recieveMessageRoute,
  uploadMediaRoute,
} from "../utils/APIRoutes";
import { encryptMessage, decryptMessage } from "../utils/crypto";
import { encryptFile } from "../utils/cryptoMedia";
import api from "../utils/axiosConfig";

export default function ChatContainer({
  currentChat,
  socket,
  darkMode,
  onCall,
  callDisabled,
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const scrollRef = useRef(null);
  const pollTimer = useRef(null);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)); }
    catch { return null; }
  })();
  const currentUserId = currentUser?._id ?? null;

  // ── Decrypt text messages ─────────────────────────────────────────────────
  const decryptAll = async (rawMessages) =>
    Promise.all(
      rawMessages.map(async (msg) => {
        if (msg.messageType !== "text" && msg.messageType) {
          // Media message — no text to decrypt, pass through as-is
          return msg;
        }
        const plaintext = await decryptMessage(msg.encryptedMessage);
        return { ...msg, message: plaintext ?? "🔒 Unable to decrypt" };
      })
    );

  // ── Fetch all messages ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUserId || !currentChat?._id) {
        setMessages([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data } = await api.post(recieveMessageRoute, {
          from: currentUserId,
          to: currentChat._id,
        });
        const decrypted = await decryptAll(data);
        setMessages(decrypted);
        setLastFetchedAt(new Date().toISOString());
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
    return () => clearInterval(pollTimer.current);
  }, [currentChat?._id, currentUserId]);

  // ── Poll for new messages ──────────────────────────────────────────────────
  const pollNewMessages = useCallback(async () => {
    if (!currentUserId || !currentChat?._id || !lastFetchedAt) return;
    try {
      const { data } = await api.post(recieveMessageRoute, {
        from: currentUserId,
        to: currentChat._id,
        after: lastFetchedAt,
      });
      if (data.length > 0) {
        const decrypted = await decryptAll(data);
        setMessages((prev) => [...prev, ...decrypted]);
        setLastFetchedAt(new Date().toISOString());
      }
    } catch {}
  }, [currentChat?._id, currentUserId, lastFetchedAt]);

  useEffect(() => {
    if (!lastFetchedAt) return;
    pollTimer.current = setInterval(pollNewMessages, 3_000);
    return () => clearInterval(pollTimer.current);
  }, [pollNewMessages, lastFetchedAt]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Send text message ──────────────────────────────────────────────────────
  const handleSendMsg = async (msg) => {
    if (!msg?.trim() || !currentUserId || !currentChat?._id) return;
    const recipientPublicKey = currentChat.publicKey;
    const senderPublicKeyJwk = localStorage.getItem("chatup-public-key-jwk");
    if (!recipientPublicKey || !senderPublicKeyJwk) {
      alert("Encryption keys not available. Please refresh and try again.");
      return;
    }
    const optimistic = { _id: `opt-${Date.now()}`, fromSelf: true, message: msg, messageType: "text", optimistic: true };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const [encryptedForSender, encryptedForRecipient] = await Promise.all([
        encryptMessage(msg, senderPublicKeyJwk),
        encryptMessage(msg, recipientPublicKey),
      ]);
      await api.post(sendMessageRoute, {
        from: currentUserId,
        to: currentChat._id,
        encryptedForSender,
        encryptedForRecipient,
      });
      setLastFetchedAt(new Date().toISOString());
    } catch (err) {
      console.error("Message send failed", err);
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      alert("Failed to send message. Please try again.");
    }
  };

  // ── Send media message ─────────────────────────────────────────────────────
  const handleSendMedia = useCallback(async (file) => {
    if (!file || !currentUserId || !currentChat?._id) return;

    const recipientPublicKey = currentChat.publicKey;
    const senderPublicKeyJwk = localStorage.getItem("chatup-public-key-jwk");
    if (!recipientPublicKey || !senderPublicKeyJwk) {
      alert("Encryption keys not available. Please refresh and try again.");
      return;
    }

    // Determine message type
    const mimeType = file.type || "application/octet-stream";
    let messageType = "document";
    if (mimeType.startsWith("image/")) messageType = "image";
    else if (mimeType.startsWith("video/")) messageType = "video";
    else if (mimeType.startsWith("audio/")) messageType = "audio";

    // Optimistic placeholder
    const optimisticId = `opt-media-${Date.now()}`;
    const optimistic = {
      _id: optimisticId,
      fromSelf: true,
      messageType,
      optimistic: true,
      media: {
        url: URL.createObjectURL(file),
        mimeType,
        fileName: file.name,
        fileSize: file.size,
        wrappedKey: null, // not available yet (optimistic)
        _objectUrl: true, // flag: already an object URL, no need to decrypt
      },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      // 1. Encrypt the file client-side
      const { encryptedBlob, wrappedKeyForSender, wrappedKeyForRecipient } =
        await encryptFile(file, senderPublicKeyJwk, recipientPublicKey);

      // 2. Upload encrypted blob to Cloudinary via backend
      const formData = new FormData();
      formData.append("file", encryptedBlob, file.name);
      formData.append("mimeType", mimeType);
      formData.append("fileName", file.name);
      formData.append("fileSize", String(file.size));
      formData.append("wrappedKeyForSender", wrappedKeyForSender);
      formData.append("wrappedKeyForRecipient", wrappedKeyForRecipient);

      const { data: uploadData } = await api.post(uploadMediaRoute, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 3. Save media message to DB
      await api.post(sendMediaMessageRoute, {
        to: currentChat._id,
        url: uploadData.url,
        publicId: uploadData.publicId,
        mimeType: uploadData.mimeType,
        fileName: uploadData.fileName,
        fileSize: uploadData.fileSize,
        wrappedKeyForSender: uploadData.wrappedKeyForSender,
        wrappedKeyForRecipient: uploadData.wrappedKeyForRecipient,
        messageType,
      });

      // Remove optimistic; next poll will fetch the real message
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
      setLastFetchedAt(new Date().toISOString());
    } catch (err) {
      console.error("Media send failed", err);
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
      alert("Failed to send media. Please try again.");
      throw err;
    }
  }, [currentChat, currentUserId]);

  const dm = darkMode;

  return (
    <div className={`relative flex h-full flex-col transition-colors duration-300 ${
      dm
        ? "bg-[#0f172a]"
        : "bg-gradient-to-br from-blue-50/60 via-slate-50 to-indigo-50/40"
    }`}>

      {/* Header */}
      <header className={`
        sticky top-0 z-10 px-4 py-3.5 flex items-center justify-between border-b transition-colors duration-300
        ${dm
          ? "bg-slate-800/95 border-slate-700/60 shadow-sm shadow-black/20"
          : "bg-white/90 backdrop-blur-2xl border-slate-200/70 shadow-sm"
        }
      `}>
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className={`h-10 w-10 rounded-full overflow-hidden ring-2 ring-offset-2 flex-shrink-0 ${
              dm ? "ring-slate-600 ring-offset-slate-800" : "ring-slate-300/40 ring-offset-white"
            }`}>
              <img
                src={`data:image/svg+xml;base64,${currentChat?.avatarImage || ""}`}
                alt={`${currentChat?.username}'s avatar`}
                className="h-full w-full object-cover"
                onError={(e) => (e.target.src = "/fallback-avatar.png")}
              />
            </div>
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 transition-colors ${
              currentChat?.online
                ? dm ? "bg-emerald-500 ring-slate-800" : "bg-emerald-500 ring-white"
                : dm ? "bg-slate-600 ring-slate-800" : "bg-slate-300 ring-white"
            }`} />
          </div>
          <div>
            <h3 className={`font-semibold tracking-tight ${dm ? "text-slate-100" : "text-slate-900"}`}>
              {currentChat?.username || "Chat"}
            </h3>
            <p className={`text-xs font-medium ${
              currentChat?.online ? "text-emerald-500" : dm ? "text-slate-500" : "text-slate-400"
            }`}>
              {currentChat?.online ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CallButton
            contact={currentChat}
            onCall={({ contact, callType }) => onCall?.({ contact, callType })}
            darkMode={dm}
            disabled={callDisabled}
          />
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            dm ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}>
            <Lock size={11} />
            <span className="hidden sm:inline">End-to-end encrypted</span>
            <span className="sm:hidden">E2E</span>
          </div>
        </div>
      </header>

      {/* E2E info banner */}
      {!isLoading && (
        <div className={`mx-4 mt-4 mb-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs ${
          dm
            ? "bg-slate-800/60 text-slate-500 border border-slate-700/40"
            : "bg-white/70 text-slate-400 border border-slate-200/70"
        }`}>
          <Lock size={10} />
          <span>Messages and media are end-to-end encrypted. Only you and {currentChat?.username} can read them.</span>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-300/70 scrollbar-track-transparent scrollbar-thumb-rounded-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className={`h-8 w-8 rounded-full border-2 border-t-transparent animate-spin ${
                dm ? "border-slate-500" : "border-slate-400"
              }`} />
              <p className={dm ? "text-slate-500" : "text-slate-400"}>Decrypting messages…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className={`text-lg font-medium ${dm ? "text-slate-400" : "text-slate-600"}`}>No messages yet</p>
            <p className={`text-sm mt-2 ${dm ? "text-slate-600" : "text-slate-400"}`}>Start the conversation ✨</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isSent = msg.fromSelf;
            const isMedia = msg.messageType && msg.messageType !== "text";

            return (
              <div
                key={msg._id || index}
                ref={isLast ? scrollRef : null}
                className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                style={{ animation: "fadeSlideIn 0.2s ease-out forwards" }}
              >
                <div className={`
                  ${isMedia ? "max-w-[85%]" : "max-w-[78%]"}
                  rounded-2xl shadow-sm overflow-hidden
                  ${isMedia
                    // Minimal padding for media, just enough for the rounded border
                    ? `p-1.5 ${isSent
                        ? dm
                          ? "bg-indigo-600 rounded-br-sm shadow-indigo-900/30"
                          : "bg-gradient-to-br from-slate-700 to-slate-900 rounded-br-sm"
                        : dm
                          ? "bg-slate-700/70 rounded-bl-sm border border-slate-600/40"
                          : "bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-bl-sm shadow-slate-200/60"
                      }`
                    : `px-4 py-2.5 text-sm leading-relaxed ${isSent
                        ? dm
                          ? "bg-indigo-600 text-white rounded-br-sm shadow-indigo-900/30"
                          : "bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-br-sm"
                        : dm
                          ? "bg-slate-700/70 text-slate-100 rounded-bl-sm border border-slate-600/40"
                          : "bg-white/90 backdrop-blur-sm border border-slate-200/80 text-slate-800 rounded-bl-sm shadow-slate-200/60"
                      }`
                  }
                  ${msg.optimistic ? "opacity-70" : ""}
                `}>
                  {isMedia ? (
                    <>
                      {/* Optimistic: show local preview without decryption */}
                      {msg.optimistic && msg.media?._objectUrl ? (
                        <OptimisticMediaPreview msg={msg} isSent={isSent} darkMode={dm} />
                      ) : (
                        <MediaMessage msg={msg} isSent={isSent} darkMode={dm} />
                      )}
                      {/* Timestamp below media */}
                      {msg.createdAt && (
                        <p className={`text-[10px] mt-1 px-1 text-right ${
                          isSent ? "text-white/50" : dm ? "text-slate-500" : "text-slate-400"
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="break-words">{msg.message}</p>
                      {msg.createdAt && (
                        <p className={`text-[10px] mt-1 text-right ${
                          isSent ? "text-white/50" : dm ? "text-slate-500" : "text-slate-400"
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Input */}
      <div className={`p-3 pb-[env(safe-area-inset-bottom,12px)] border-t transition-colors duration-300 ${
        dm
          ? "border-slate-700/60 bg-slate-800/60"
          : "border-slate-200/60 bg-white/60 backdrop-blur-sm"
      }`}>
        <ChatInput
          handleSendMsg={handleSendMsg}
          handleSendMedia={handleSendMedia}
          darkMode={dm}
        />
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Optimistic preview (before upload completes) ──────────────────────────────
function OptimisticMediaPreview({ msg, isSent, darkMode }) {
  const { mimeType, url, fileName } = msg.media;
  const dm = darkMode;

  if (mimeType?.startsWith("image/")) {
    return (
      <img
        src={url}
        alt="Sending…"
        className="max-w-[240px] max-h-[300px] rounded-xl object-cover opacity-60"
      />
    );
  }
  if (mimeType?.startsWith("video/")) {
    return (
      <video
        src={url}
        className="max-w-[280px] rounded-xl opacity-60"
        style={{ maxHeight: 300 }}
      />
    );
  }
  return (
    <div className={`flex items-center gap-2 py-1 px-1 opacity-60`}>
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-[9px] font-bold ${
        isSent ? "bg-white/20 text-white" : dm ? "bg-slate-600 text-slate-300" : "bg-slate-200 text-slate-600"
      }`}>
        {fileName?.split(".").pop()?.toUpperCase().slice(0, 4) || "FILE"}
      </div>
      <span className={`text-xs ${isSent ? "text-white/70" : dm ? "text-slate-400" : "text-slate-500"}`}>
        Uploading…
      </span>
    </div>
  );
}
