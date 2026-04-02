// ChatContainer.jsx
import React, { useState, useEffect, useRef } from "react";
import ChatInput from "./ChatInput";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";

export default function ChatContainer({ currentChat, socket, darkMode }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef(null);
  const [arrivalMessage, setArrivalMessage] = useState(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
    } catch {
      return null;
    }
  })();

  // Load previous messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser?._id || !currentChat?._id) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data } = await axios.post(recieveMessageRoute, {
          from: currentUser._id,
          to: currentChat._id,
        });
        setMessages(data || []);
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [currentChat?._id, currentUser?._id]);

  // Append new incoming message
  useEffect(() => {
    if (arrivalMessage) {
      setMessages((prev) => [...prev, arrivalMessage]);
      setArrivalMessage(null);
    }
  }, [arrivalMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMsg = async (msg) => {
    if (!msg?.trim() || !currentUser?._id || !currentChat?._id) return;

    const optimisticMsg = { fromSelf: true, message: msg };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await axios.post(sendMessageRoute, {
        from: currentUser._id,
        to: currentChat._id,
        message: msg,
      });
    } catch (err) {
      console.error("Message send failed", err);
      setMessages((prev) => prev.filter((m) => m !== optimisticMsg));
    }
  };

  return (
    <div className={`relative flex h-full flex-col transition-colors duration-300 ${
      darkMode
        ? "bg-slate-900"
        : "bg-gradient-to-b from-slate-50 via-slate-100 to-white"
    }`}>

      {/* Header */}
      <header className={`
        sticky top-0 z-10 px-4 py-3.5
        flex items-center justify-between border-b
        transition-colors duration-300
        ${darkMode
          ? "bg-slate-800/90 border-slate-700/60"
          : "bg-white/70 backdrop-blur-2xl border-slate-200/70 shadow-sm"
        }
      `}>
        <div className="flex items-center gap-3.5">
          <div className={`h-10 w-10 rounded-full overflow-hidden ring-2 ring-offset-2 flex-shrink-0 ${
            darkMode ? "ring-slate-600 ring-offset-slate-800" : "ring-slate-300/40 ring-offset-white"
          }`}>
            <img
              src={`data:image/svg+xml;base64,${currentChat?.avatarImage || ""}`}
              alt={`${currentChat?.username}'s avatar`}
              className="h-full w-full object-cover"
              onError={(e) => (e.target.src = "/fallback-avatar.png")}
            />
          </div>
          <div>
            <h3 className={`font-semibold tracking-tight ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
              {currentChat?.username || "Chat"}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>online</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-300/70 scrollbar-track-transparent scrollbar-thumb-rounded-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className={`h-8 w-8 rounded-full border-2 border-t-transparent animate-spin ${
                darkMode ? "border-slate-500" : "border-slate-400"
              }`} />
              <p className={darkMode ? "text-slate-500" : "text-slate-400"}>Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className={`text-lg font-medium ${darkMode ? "text-slate-400" : "text-slate-600"}`}>No messages yet</p>
            <p className={`text-sm mt-2 ${darkMode ? "text-slate-600" : "text-slate-400"}`}>Start the conversation ✨</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isSent = msg.fromSelf;

            return (
              <div
                key={msg._id || `${index}-${msg.message?.slice(0, 10)}`}
                ref={isLast ? scrollRef : null}
                className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                style={{
                  animation: "fadeSlideIn 0.2s ease-out forwards",
                }}
              >
                <div className={`
                  max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                  shadow-sm transition-all duration-150
                  ${isSent
                    ? darkMode
                      ? "bg-indigo-600 text-white rounded-br-sm shadow-indigo-900/30"
                      : "bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-br-sm shadow-slate-500/20"
                    : darkMode
                      ? "bg-slate-700/80 text-slate-100 rounded-bl-sm border border-slate-600/50"
                      : "bg-white/80 backdrop-blur-sm border border-slate-200/80 text-slate-800 rounded-bl-sm"
                  }
                `}>
                  <p className="break-words">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Input area */}
      <div className={`p-3 pb-[env(safe-area-inset-bottom,12px)] border-t transition-colors duration-300 ${
        darkMode ? "border-slate-700/60 bg-slate-800/50" : "border-slate-200/60 bg-transparent"
      }`}>
        <ChatInput handleSendMsg={handleSendMsg} darkMode={darkMode} />
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
