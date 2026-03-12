// Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load current user + protect route
  useEffect(() => {
    const userData = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);

    if (!userData) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      if (parsed?._id) {
        setCurrentUser(parsed);
      } else {
        localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
        navigate("/login");
      }
    } catch (err) {
      console.error("Invalid user data:", err);
      localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
      navigate("/login");
    }
  }, [navigate]);

  // 2. Socket connection
  useEffect(() => {
    if (!currentUser?._id) return;

    socket.current = io(host, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.current.emit("add-user", currentUser._id);

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [currentUser?._id]);

  // 3. Fetch all users / contacts
  useEffect(() => {
    if (!currentUser) return;

    const fetchUsers = async () => {
      setIsLoading(true);

      try {
        if (!currentUser.isAvatarImageSet) {
          navigate("/setAvatar");
          return;
        }

        const { data } = await axios.get(`${allUsersRoute}/${currentUser._id}`);
        setContacts(data || []);
      } catch (err) {
        console.error("Failed to load contacts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser, navigate]);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  // ────────────────────────────────────────────────

  if (isLoading || !currentUser) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-lg">Loading your chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black">

      {/* Main layout – sidebar + content */}
      <div className="
        relative flex w-full max-w-[1800px] mx-auto h-full
        shadow-2xl shadow-black/60 rounded-xl overflow-hidden
        border border-gray-800/40
      ">

        {/* Sidebar (Contacts) */}
        <aside
          className={`
            hidden md:block md:w-80 lg:w-96 flex-shrink-0
            border-r border-gray-800/50 bg-gray-900/70 backdrop-blur-xl
            overflow-hidden
          `}
        >
          <Contacts contacts={contacts} changeChat={handleChatChange} />
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-950/60 backdrop-blur-sm">

          {/* Mobile header with back + contact info */}
          <div className="md:hidden sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3 flex items-center gap-3">
            {currentChat && (
              <button
                onClick={() => setCurrentChat(undefined)}
                className="p-2 hover:bg-gray-800/60 rounded-full transition-colors"
                aria-label="Back to contacts"
              >
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {currentChat ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex-shrink-0" />
                <h2 className="font-semibold text-white truncate">
                  {currentChat.username}
                </h2>
              </div>
            ) : (
              <h2 className="font-semibold text-white">Messages</h2>
            )}
          </div>

          {/* Chat content or Welcome */}
          {currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer currentChat={currentChat} socket={socket} />
          )}
        </main>
      </div>

      {/* Mobile floating contacts button when chat is open */}
      <button
        className="md:hidden fixed bottom-6 right-6 z-30 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl shadow-purple-900/40 hover:scale-105 transition-transform"
        onClick={() => setCurrentChat(undefined)}
        aria-label="Open contacts"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
    </div>
  );
}