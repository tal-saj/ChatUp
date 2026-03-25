import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import Navigation from "../components/Navigation";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // ─── 1. Load current user + protect route ───
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

  // ─── 2. Socket connection ───
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

  // ─── 3. Fetch contacts ───
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

  // ─── Loading overlay ───
  if (isLoading || !currentUser) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 animate-pulse">
          <div className="h-14 w-14 rounded-full border-4 border-slate-300 border-t-indigo-500/70 animate-spin" />
          <p className="text-slate-500 font-medium tracking-wide">Preparing your messages...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="relative flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white pt-16">
        {/* Centered container with soft shadow & very light border */}
        <div
          className="
            relative flex w-full max-w-[1800px] mx-auto h-full
            shadow-2xl shadow-slate-300/40 rounded-2xl overflow-hidden
            border border-slate-200/70 bg-white/60 backdrop-blur-xl
            transition-all duration-500
          "
        >
          {/* ─── Sidebar (Contacts) ─── */}
          <aside
            className={`
              hidden md:block md:w-80 lg:w-96 flex-shrink-0
              border-r border-slate-200/60 bg-white/40 backdrop-blur-2xl
              overflow-y-auto transition-all duration-400
              ${currentChat ? "md:opacity-90" : "md:opacity-100"}
            `}
          >
            <Contacts contacts={contacts} changeChat={handleChatChange} />
          </aside>

          {/* ─── Main chat area ─── */}
          <main className="flex-1 flex flex-col min-w-0 bg-white/30 backdrop-blur-md">
            {/* Mobile header */}
            <div
              className="
                md:hidden sticky top-0 z-20
                bg-white/70 backdrop-blur-2xl border-b border-slate-200/60
                px-4 py-3.5 flex items-center gap-3.5 shadow-sm
                transition-all duration-300
              "
            >
              {currentChat && (
                <button
                  onClick={() => setCurrentChat(undefined)}
                  className="
                    p-2.5 hover:bg-slate-100 active:bg-slate-200
                    rounded-full transition-all duration-200 hover:scale-105
                  "
                  aria-label="Back to contacts"
                >
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {currentChat ? (
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex-shrink-0 shadow-inner" />
                  <h2 className="font-semibold text-slate-800 truncate text-lg">
                    {currentChat.username}
                  </h2>
                </div>
              ) : (
                <h2 className="font-semibold text-slate-800 text-lg">Messages</h2>
              )}
            </div>

            {/* Chat content or Welcome */}
            <div className="flex-1 overflow-hidden transition-opacity duration-400">
              {currentChat === undefined ? (
                <Welcome />
              ) : (
                <ChatContainer currentChat={currentChat} socket={socket} />
              )}
            </div>
          </main>
        </div>

        {/* ─── Mobile floating contacts button ─── */}
        <button
          className="
            md:hidden fixed bottom-6 right-6 z-40
            bg-gradient-to-br from-slate-700 to-slate-900
            text-white p-4 rounded-full
            shadow-xl shadow-slate-500/30
            hover:shadow-2xl hover:shadow-slate-600/40
            hover:scale-110 active:scale-95
            transition-all duration-300 ease-out
          "
          onClick={() => setCurrentChat(undefined)}
          aria-label="Open contacts list"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      </div>
    </>
  );
}