// components/ChatContainer.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatInput from "./ChatInput";
import CallButton from "./CallButton";
import { Lock } from "lucide-react";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { encryptMessage, decryptMessage } from "../utils/crypto";
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

  const decryptAll = async (rawMessages) =>
    Promise.all(
      rawMessages.map(async (msg) => {
        const plaintext = await decryptMessage(msg.encryptedMessage);
        return { ...msg, message: plaintext ?? "🔒 Unable to decrypt" };
      })
    );

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMsg = async (msg) => {
    if (!msg?.trim() || !currentUserId || !currentChat?._id) return;
    const recipientPublicKey = currentChat.publicKey;
    const senderPublicKeyJwk = localStorage.getItem("chatup-public-key-jwk");
    if (!recipientPublicKey || !senderPublicKeyJwk) {
      alert("Encryption keys not available. Please refresh and try again.");
      return;
    }
    const optimistic = { _id: `opt-${Date.now()}`, fromSelf: true, message: msg, optimistic: true };
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

  const dm = darkMode;

  return (
    <div className={`relative flex h-full flex-col transition-colors duration-300 ${
      dm
        ? "bg-[#0f172a]"                          // deep navy — clearly different from slate-900 sidebar
        : "bg-gradient-to-br from-blue-50/60 via-slate-50 to-indigo-50/40" // soft cool tint vs white sidebar
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

        {/* Right: call button + E2E badge */}
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
          <span>Messages are end-to-end encrypted. Only you and {currentChat?.username} can read them.</span>
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
              <p className={dm ? "text-slate-500" : "text-slate-400"}>Decrypting messages...</p>
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
            return (
              <div
                key={msg._id || index}
                ref={isLast ? scrollRef : null}
                className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                style={{ animation: "fadeSlideIn 0.2s ease-out forwards" }}
              >
                <div className={`
                  max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${isSent
                    ? dm
                      ? "bg-indigo-600 text-white rounded-br-sm shadow-indigo-900/30"
                      : "bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-br-sm"
                    : dm
                      ? "bg-slate-700/70 text-slate-100 rounded-bl-sm border border-slate-600/40"
                      : "bg-white/90 backdrop-blur-sm border border-slate-200/80 text-slate-800 rounded-bl-sm shadow-slate-200/60"
                  }
                  ${msg.optimistic ? "opacity-70" : ""}
                `}>
                  <p className="break-words">{msg.message}</p>
                  {msg.createdAt && (
                    <p className={`text-[10px] mt-1 text-right ${
                      isSent ? "text-white/50" : dm ? "text-slate-500" : "text-slate-400"
                    }`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
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
        <ChatInput handleSendMsg={handleSendMsg} darkMode={dm} />
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
