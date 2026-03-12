// ChatContainer.jsx
import React, { useState, useEffect, useRef } from "react";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
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

  // Load messages
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
        // You can add toast here later
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [currentChat?._id, currentUser?._id]);

  // Socket incoming message
  useEffect(() => {
    if (!socket?.current) return;

    const currentSocket = socket.current;

    const handleReceive = (msg) => {
      setArrivalMessage({ fromSelf: false, message: msg });
    };

    currentSocket.on("msg-recieve", handleReceive);

    return () => {
      currentSocket.off("msg-recieve", handleReceive);
    };
  }, [socket]);

  // Append arrived message
  useEffect(() => {
    if (arrivalMessage) {
      setMessages((prev) => [...prev, arrivalMessage]);
      setArrivalMessage(null);
    }
  }, [arrivalMessage]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMsg = async (msg) => {
    if (!msg?.trim() || !currentUser?._id || !currentChat?._id) return;

    const optimisticMsg = { fromSelf: true, message: msg };

    // Optimistic update
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      socket.current.emit("send-msg", {
        to: currentChat._id,
        from: currentUser._id,
        msg,
      });

      await axios.post(sendMessageRoute, {
        from: currentUser._id,
        to: currentChat._id,
        message: msg,
      });
    } catch (err) {
      console.error("Message send failed", err);
      // Optional: remove optimistic message or show error
      setMessages((prev) => prev.filter((m) => m !== optimisticMsg));
    }
  };

  // ────────────────────────────────────────────────

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-black">

      {/* Header - glassmorphic */}
      <header className="sticky top-0 z-10 bg-gray-900/60 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-purple-500/40 ring-offset-2 ring-offset-black flex-shrink-0">
            <img
              src={`data:image/svg+xml;base64,${currentChat?.avatarImage || ""}`}
              alt="avatar"
              className="h-full w-full object-cover"
              onError={(e) => (e.target.src = "/fallback-avatar.png")} // ← add fallback
            />
          </div>
          <div>
            <h3 className="font-semibold text-white tracking-tight">
              {currentChat?.username || "Chat"}
            </h3>
            <p className="text-xs text-emerald-400/90">online</p>
          </div>
        </div>

        <Logout />
      </header>

      {/* Messages area */}
      <main
        className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm mt-2 opacity-80">Say something nice 👋</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isLast = index === messages.length - 1;
            const isSent = msg.fromSelf;

            return (
              <div
                key={msg._id || `${index}-${msg.message.slice(0, 10)}`}
                ref={isLast ? scrollRef : null}
                className={`flex ${isSent ? "justify-end" : "justify-start"} group`}
              >
                <div
                  className={`
                    max-w-[78%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed
                    shadow-sm transition-all duration-180
                    ${isSent
                      ? "bg-gradient-to-br from-indigo-600/90 to-purple-600/90 text-white rounded-br-none"
                      : "bg-gray-800/70 backdrop-blur-sm border border-gray-700/50 text-gray-100 rounded-bl-none"
                    }
                    group-hover:shadow-md
                  `}
                >
                  <p className="break-words">{msg.message}</p>

                  {/* You can add time here later */}
                  {/* <span className="text-xs opacity-60 mt-1.5 block text-right">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span> */}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Input - floating pill style */}
      <div className="p-4 pb-[env(safe-area-inset-bottom)] bg-transparent">
        <div className="
          bg-gray-900/70 backdrop-blur-2xl border border-gray-700/40
          rounded-full px-4 py-3 flex items-center gap-3 shadow-2xl shadow-black/40
        ">
          <ChatInput handleSendMsg={handleSendMsg} />
        </div>
      </div>
    </div>
  );
}