// Contacts.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import Logo from "../assets/logo.svg";
import Logout from "./Logout";
import axios from "axios";
import { friendRequestsRoute } from "../utils/APIRoutes";

export default function Contacts({ contacts, changeChat, darkMode, toggleDarkMode, unreadCounts = {} }) {
  const navigate = useNavigate();
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [mounted, setMounted] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
      if (data?.username && data?.avatarImage) {
        setCurrentUserName(data.username);
        setCurrentUserImage(data.avatarImage);
      }
    } catch (err) {
      console.error("Failed to load current user:", err);
    }
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Poll for pending friend requests to show badge on Friends button
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const stored = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
        const user = stored ? JSON.parse(stored) : null;
        if (!user?.token) return;

        const { data } = await axios.get(friendRequestsRoute, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setPendingRequestCount(Array.isArray(data) ? data.length : 0);
      } catch {}
    };

    fetchPendingCount();
    const timer = setInterval(fetchPendingCount, 30_000);
    return () => clearInterval(timer);
  }, []);

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  if (!currentUserName || !currentUserImage) {
    return (
      <div className={`h-full flex items-center justify-center ${darkMode ? "bg-slate-900 text-slate-400" : "bg-slate-50 text-slate-400"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
          <p className="text-sm font-medium">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col transition-colors duration-300 ${darkMode ? "bg-slate-900" : "bg-gradient-to-b from-slate-50 via-slate-100 to-white"}`}>

      {/* Header */}
      <div className={`shrink-0 flex items-center gap-3 py-4 px-4 border-b transition-colors duration-300 ${
        darkMode ? "border-slate-700/60 bg-slate-800/80" : "border-slate-200/70 bg-white/60 backdrop-blur-xl shadow-sm"
      }`}>
        <img src={Logo} alt="ChatUp" className="h-7 w-auto drop-shadow-sm transition-transform hover:scale-105" />
        <h3 className={`text-lg font-bold tracking-tight flex-1 ${darkMode ? "text-slate-100" : "text-slate-800"}`}>ChatUp</h3>

        {/* Dark/Light toggle */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? "Light mode" : "Dark mode"}
          className={`p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
            darkMode ? "bg-slate-700 text-yellow-400 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {darkMode
            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm9-7a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm14.95 5.657a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 0 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM6.464 6.464a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 5.757 4.343l.707.707a1 1 0 0 1 0 1.414zm12.143-1.414a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM6.464 17.536a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z"/></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
          }
        </button>

        {/* Friends button with badge */}
        <button
          onClick={() => navigate("/friends")}
          title="Friends"
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
            darkMode ? "bg-indigo-600/80 text-indigo-100 hover:bg-indigo-500" : "bg-slate-800 text-white hover:bg-slate-700 shadow-sm"
          }`}
        >
          <Users size={13} />
          <span>Friends</span>
          {pendingRequestCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white animate-pulse">
              {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
            </span>
          )}
        </button>
      </div>

      {/* Contacts list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-300/70 scrollbar-track-transparent scrollbar-thumb-rounded-full">
        {contacts.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-full text-center px-4 py-12 ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            <Users size={32} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No contacts yet</p>
            <p className="text-xs mt-1 opacity-70">Add friends to start chatting</p>
          </div>
        )}

        {contacts.map((contact, index) => {
          const isSelected = index === currentSelected;
          const unread = unreadCounts[contact._id] || 0;

          return (
            <div
              key={contact._id}
              onClick={() => changeCurrentChat(index, contact)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); changeCurrentChat(index, contact); }
              }}
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateX(0)" : "translateX(-10px)",
                transition: `opacity 0.3s ease ${index * 40}ms, transform 0.3s ease ${index * 40}ms`,
              }}
              className={`
                group flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer transition-colors duration-150
                ${isSelected
                  ? darkMode ? "bg-slate-700 border border-slate-600/80 shadow-md" : "bg-white border border-slate-300/80 shadow-md shadow-slate-400/20"
                  : darkMode ? "hover:bg-slate-800/70" : "hover:bg-white/80 hover:shadow-sm"
                }
                focus:outline-none focus:ring-2 focus:ring-slate-400/40
              `}
            >
              {/* Avatar with online dot */}
              <div className="relative flex-shrink-0">
                <div className={`h-11 w-11 rounded-full overflow-hidden ring-2 transition-all duration-200 ${
                  isSelected
                    ? darkMode ? "ring-indigo-400 ring-offset-2 ring-offset-slate-700" : "ring-slate-500 ring-offset-2 ring-offset-white"
                    : darkMode ? "ring-slate-600" : "ring-slate-300/60 group-hover:ring-slate-400"
                }`}>
                  <img
                    src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                    alt={`${contact.username}'s avatar`}
                    className="h-full w-full object-cover"
                    onError={(e) => (e.target.src = "/fallback-avatar.png")}
                  />
                </div>
                {/* Online/Offline indicator */}
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 transition-colors duration-500 ${
                  contact.online
                    ? "bg-emerald-500 ring-white"
                    : darkMode ? "bg-slate-600 ring-slate-700" : "bg-slate-300 ring-white"
                }`} />
              </div>

              {/* Name + status */}
              <div className="min-w-0 flex-1">
                <h3 className={`font-medium truncate text-sm ${
                  isSelected
                    ? darkMode ? "text-white" : "text-slate-900"
                    : darkMode ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900"
                }`}>
                  {contact.username}
                </h3>
                <p className={`text-xs font-medium ${
                  contact.online
                    ? "text-emerald-500"
                    : darkMode ? "text-slate-600" : "text-slate-400"
                }`}>
                  {contact.online ? "Online" : "Offline"}
                </p>
              </div>

              {/* Unread badge */}
              {unread > 0 && (
                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current user bar */}
      <div className={`shrink-0 border-t px-4 py-3.5 flex items-center gap-3 transition-colors duration-300 ${
        darkMode ? "border-slate-700/60 bg-slate-800/80" : "border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-sm"
      }`}>
        <div className="relative">
          <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-slate-400/50 ring-offset-1 flex-shrink-0">
            <img src={`data:image/svg+xml;base64,${currentUserImage}`} alt="Your avatar" className="h-full w-full object-cover" />
          </div>
          {/* Self is always shown as online since we're in the app */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`font-semibold truncate text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{currentUserName}</h2>
          <p className="text-xs font-medium text-emerald-500">Online</p>
        </div>
        <Logout darkMode={darkMode} />
      </div>
    </div>
  );
}
