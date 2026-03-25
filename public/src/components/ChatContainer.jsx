// ChatContainer.jsx
import React, { useState, useEffect, useRef } from "react";
import ChatInput from "./ChatInput";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef(null);
  const [arrivalMessage, setArrivalMessage] = useState(null);

  const currentUser = JSON.parse(
    localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
  );

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

    // Optimistic UI update
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
     
      await axios.post(sendMessageRoute, {
        from: currentUser._id,
        to: currentChat._id,
        message: msg,
      });
    } catch (err) {
      console.error("Message send failed", err);
      // Rollback optimistic update on failure
      setMessages((prev) => prev.filter((m) => m !== optimisticMsg));
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-slate-50 via-slate-100 to-white">

      {/* Header – glassmorphic */}
      <header className="
        sticky top-0 z-10
        bg-white/70 backdrop-blur-2xl border-b border-slate-200/70
        px-4 py-3.5 flex items-center justify-between
        shadow-sm
      ">
        <div className="flex items-center gap-3.5">
          <div className="
            h-10 w-10 rounded-full overflow-hidden
            ring-2 ring-slate-300/40 ring-offset-2 ring-offset-white
            flex-shrink-0 shadow-sm
          ">
            <img
              src={`data:image/svg+xml;base64,${currentChat?.avatarImage || ""}`}
              alt={`${currentChat?.username}'s avatar`}
              className="h-full w-full object-cover"
              onError={(e) => (e.target.src = "/fallback-avatar.png")}
            />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 tracking-tight">
              {currentChat?.username || "Chat"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">online</p>
          </div>
        </div>

      </header>

      {/* Messages area */}
      <main className="
        flex-1 overflow-y-auto px-4 py-6 space-y-5
        scrollbar-thin scrollbar-thumb-slate-300/70 scrollbar-track-transparent
        scrollbar-thumb-rounded-full
      ">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-3 border-slate-300 border-t-slate-500 animate-spin" />
              <p>Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <p className="text-lg font-medium text-slate-600">No messages yet</p>
            <p className="text-sm mt-2 opacity-90">Start the conversation ✨</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isSent = msg.fromSelf;

            return (
              <div
                key={msg._id || `${index}-${msg.message?.slice(0, 20) || "msg"}`}
                ref={isLast ? scrollRef : null}
                className={`flex ${isSent ? "justify-end" : "justify-start"} group animate-fade-in`}
              >
                <div
                  className={`
                    max-w-[78%] px-4 py-3.5 rounded-2xl text-[15px] leading-relaxed
                    shadow-sm transition-all duration-200
                    ${
                      isSent
                        ? "bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-br-none shadow-md shadow-slate-500/30"
                        : "bg-white/70 backdrop-blur-sm border border-slate-200/80 text-slate-800 rounded-bl-none shadow-sm"
                    }
                    group-hover:shadow-md group-hover:brightness-[1.02]
                  `}
                >
                  <p className="break-words">{msg.message}</p>

                  {/* Optional: add timestamp later */}
                  {/* <span className="text-xs opacity-60 mt-1.5 block text-right">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span> */}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Message input – floating pill */}
      <div className="p-4 pb-[env(safe-area-inset-bottom)] bg-transparent">
        <div className="
          bg-white/70 backdrop-blur-2xl border border-slate-200/70
          rounded-full px-4 py-3 flex items-center gap-3
          shadow-lg shadow-slate-400/20
          transition-shadow duration-300
          focus-within:shadow-xl focus-within:shadow-slate-400/30
        ">
          <ChatInput handleSendMsg={handleSendMsg} />
        </div>
      </div>
    </div>
  );
}