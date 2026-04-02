// Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { allUsersRoute } from "../utils/APIRoutes";
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

  // Dark mode — persisted in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("chatup-theme") === "dark";
  });

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("chatup-theme", next ? "dark" : "light");
      return next;
    });
  };

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

  // 2. Fetch contacts
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

  if (isLoading || !currentUser) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center ${darkMode ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="flex flex-col items-center gap-5">
          <div className="h-12 w-12 rounded-full border-4 border-slate-300 border-t-indigo-500/70 animate-spin" />
          <p className={`font-medium tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Preparing your messages...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden transition-colors duration-300 ${
      darkMode
        ? "bg-slate-950"
        : "bg-gradient-to-br from-slate-100 via-slate-50 to-white"
    }`}>
      <div className={`
        relative flex w-full max-w-[1800px] mx-auto h-full
        shadow-2xl rounded-2xl overflow-hidden
        transition-all duration-500
        ${darkMode
          ? "border border-slate-700/50 bg-slate-900 shadow-black/40"
          : "border border-slate-200/70 bg-white/60 backdrop-blur-xl shadow-slate-300/40"
        }
      `}>

        {/* Sidebar */}
        <aside className={`
          hidden md:block md:w-80 lg:w-96 flex-shrink-0
          border-r overflow-y-auto transition-all duration-300
          ${darkMode ? "border-slate-700/50" : "border-slate-200/60"}
        `}>
          <Contacts
            contacts={contacts}
            changeChat={handleChatChange}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
        </aside>

        {/* Main chat area */}
        <main className={`flex-1 flex flex-col min-w-0 transition-colors duration-300 ${
          darkMode ? "bg-slate-900/50" : "bg-white/30 backdrop-blur-md"
        }`}>

          {/* Mobile header */}
          <div className={`
            md:hidden sticky top-0 z-20
            px-4 py-3.5 flex items-center gap-3.5
            border-b transition-colors duration-300
            ${darkMode
              ? "bg-slate-800/90 border-slate-700/60"
              : "bg-white/70 backdrop-blur-2xl border-slate-200/60 shadow-sm"
            }
          `}>
            {currentChat && (
              <button
                onClick={() => setCurrentChat(undefined)}
                className={`p-2.5 rounded-full transition-all duration-200 hover:scale-105 ${
                  darkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
                aria-label="Back to contacts"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {currentChat ? (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={`data:image/svg+xml;base64,${currentChat.avatarImage}`}
                    alt={currentChat.username}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h2 className={`font-semibold truncate ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
                  {currentChat.username}
                </h2>
              </div>
            ) : (
              <h2 className={`font-semibold text-lg ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
                Messages
              </h2>
            )}

            {/* Mobile dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className={`ml-auto p-2 rounded-full transition-all ${
                darkMode ? "bg-slate-700 text-yellow-400" : "bg-slate-100 text-slate-600"
              }`}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm9-7a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm14.95 5.657a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 0 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM6.464 6.464a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 5.757 4.343l.707.707a1 1 0 0 1 0 1.414zm12.143-1.414a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM6.464 17.536a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 overflow-hidden">
            {currentChat === undefined ? (
              <Welcome darkMode={darkMode} />
            ) : (
              <ChatContainer currentChat={currentChat} socket={socket} darkMode={darkMode} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile floating contacts button */}
      <button
        className={`
          md:hidden fixed bottom-6 right-6 z-40
          p-4 rounded-full shadow-xl
          hover:scale-110 active:scale-95
          transition-all duration-300 ease-out
          ${darkMode
            ? "bg-indigo-600 text-white shadow-indigo-900/40 hover:bg-indigo-500"
            : "bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-slate-500/30"
          }
        `}
        onClick={() => setCurrentChat(undefined)}
        aria-label="Open contacts list"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
    </div>
  );
}
