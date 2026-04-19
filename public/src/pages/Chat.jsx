import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { allUsersRoute, uploadKeyRoute, heartbeatRoute, unreadCountsRoute } from "../utils/APIRoutes";
import { generateAndStoreKeyPair, hasKeyPair, getStoredPublicKeyJwk } from "../utils/crypto";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import api from "../utils/axiosConfig"; // Using custom axios instance

// A user is "online" if their lastSeen is within 45 seconds
const isOnline = (lastSeen) => {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 45_000;
};

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef(null);
  const heartbeatTimer = useRef(null);
  const unreadTimer = useRef(null);
  const contactsRefreshTimer = useRef(null);

  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({}); // { senderId: count }
  const [unreadSince, setUnreadSince] = useState(new Date().toISOString());

  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem("chatup-theme") === "dark"
  );

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("chatup-theme", next ? "dark" : "light");
      return next;
    });
  };

  // ── 1. Load current user ────────────────────────────────────────────────
  useEffect(() => {
    const userData = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
    if (!userData) { navigate("/login"); return; }

    try {
      const parsed = JSON.parse(userData);
      if (parsed?._id) {
        setCurrentUser(parsed);
      } else {
        localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
        navigate("/login");
      }
    } catch {
      localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
      navigate("/login");
    }
  }, [navigate]);

  // ── 2. E2E key setup + fetch contacts ──────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const setup = async () => {
      setIsLoading(true);

      if (!currentUser.isAvatarImageSet) {
        navigate("/setAvatar");
        return;
      }

      // Generate RSA key pair if this device doesn't have one yet
      if (!hasKeyPair()) {
        try {
          const { publicJwk } = await generateAndStoreKeyPair();
          // Replaced axios.post with api.post
          await api.post(uploadKeyRoute, {
            userId: currentUser._id,
            publicKey: JSON.stringify(publicJwk),
          });
        } catch (err) {
          console.error("Key generation failed:", err);
        }
      } else {
        // Ensure server has the public key (handles clearing localStorage manually)
        const stored = getStoredPublicKeyJwk();
        if (stored) {
          // Replaced axios.post with api.post
          await api.post(uploadKeyRoute, {
            userId: currentUser._id,
            publicKey: stored,
          }).catch(() => {});
        }
      }

      try {
        // Replaced axios.get with api.get
        const { data } = await api.get(`${allUsersRoute}/${currentUser._id}`);
        setContacts(data || []);
      } catch (err) {
        console.error("Failed to load contacts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    setup();
  }, [currentUser, navigate]);

  // ── 3. Heartbeat – mark self as online every 30s ───────────────────────
  useEffect(() => {
    if (!currentUser) return;

    // Replaced axios.post with api.post
    const beat = () =>
      api.post(heartbeatRoute, { userId: currentUser._id }).catch(() => {});

    beat(); // immediate first beat
    heartbeatTimer.current = setInterval(beat, 30_000);

    return () => clearInterval(heartbeatTimer.current);
  }, [currentUser]);

  // ── 4. Refresh contacts (online status) every 35s ─────────────────────
  const refreshContacts = useCallback(async () => {
    if (!currentUser) return;
    try {
      // Replaced axios.get with api.get
      const { data } = await api.get(`${allUsersRoute}/${currentUser._id}`);
      setContacts(data || []);
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    contactsRefreshTimer.current = setInterval(refreshContacts, 35_000);
    return () => clearInterval(contactsRefreshTimer.current);
  }, [currentUser, refreshContacts]);

  // ── 5. Poll for unread message counts every 5s ─────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const fetchUnread = async () => {
      try {
        // Replaced axios.post with api.post
        const { data } = await api.post(unreadCountsRoute, {
          userId: currentUser._id,
          since: unreadSince,
        });
        if (Object.keys(data).length > 0) {
          setUnreadCounts((prev) => {
            const merged = { ...prev };
            Object.entries(data).forEach(([sid, count]) => {
              merged[sid] = (merged[sid] || 0) + count;
            });
            return merged;
          });
          // Browser notification
          Object.entries(data).forEach(([sid, count]) => {
            const sender = contacts.find((c) => c._id === sid);
            if (sender && Notification.permission === "granted") {
              new Notification(`ChatUp — ${sender.username}`, {
                body: `${count} new message${count > 1 ? "s" : ""}`,
                icon: "/logo192.png",
              });
            }
          });
          setUnreadSince(new Date().toISOString());
        }
      } catch {}
    };

    unreadTimer.current = setInterval(fetchUnread, 5_000);
    return () => clearInterval(unreadTimer.current);
  }, [currentUser, contacts, unreadSince]);

  // ── 6. Request notification permission once ────────────────────────────
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
    // Clear unread badge for this contact when opening the chat
    if (chat?._id) {
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[chat._id];
        return next;
      });
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center ${darkMode ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="flex flex-col items-center gap-5">
          <div className="h-12 w-12 rounded-full border-4 border-slate-300 border-t-indigo-500/70 animate-spin" />
          <p className={`font-medium tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Setting up secure session...
          </p>
        </div>
      </div>
    );
  }

  // Augment contacts with live online status
  const contactsWithStatus = contacts.map((c) => ({
    ...c,
    online: isOnline(c.lastSeen),
  }));

  // ── Auto-logout Inactivity Timer ─────────────────────────────────────────
  useEffect(() => {
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let timer;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Clear user data and redirect to login
        localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
        navigate("/login");
      }, TIMEOUT);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    
    // Attach listeners to track activity
    events.forEach((e) => window.addEventListener(e, reset));
    
    reset(); // Initial timer start

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [navigate]);

  // ── Render Logic ──
  return (
    <div className={`relative flex h-screen w-screen overflow-hidden transition-colors duration-300 ${
      darkMode ? "bg-slate-950" : "bg-gradient-to-br from-slate-100 via-slate-50 to-white"
    }`}>
      <div className={`
        relative flex w-full max-w-[1800px] mx-auto h-full
        shadow-2xl rounded-2xl overflow-hidden transition-all duration-500
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
            contacts={contactsWithStatus}
            changeChat={handleChatChange}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            unreadCounts={unreadCounts}
          />
        </aside>

        {/* Main */}
        <main className={`flex-1 flex flex-col min-w-0 transition-colors duration-300 ${
          darkMode ? "bg-slate-900/50" : "bg-white/30 backdrop-blur-md"
        }`}>
          {/* Mobile header */}
          <div className={`
            md:hidden sticky top-0 z-20 px-4 py-3.5 flex items-center gap-3.5 border-b transition-colors duration-300
            ${darkMode ? "bg-slate-800/90 border-slate-700/60" : "bg-white/70 backdrop-blur-2xl border-slate-200/60 shadow-sm"}
          `}>
            {currentChat && (
              <button onClick={() => setCurrentChat(undefined)}
                className={`p-2.5 rounded-full transition-all ${darkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {currentChat ? (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <div className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0">
                    <img src={`data:image/svg+xml;base64,${currentChat.avatarImage}`} alt={currentChat.username} className="h-full w-full object-cover" />
                  </div>
                  {currentChat.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                  )}
                </div>
                <h2 className={`font-semibold truncate ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{currentChat.username}</h2>
              </div>
            ) : (
              <h2 className={`font-semibold text-lg ${darkMode ? "text-slate-100" : "text-slate-800"}`}>Messages</h2>
            )}
            <button onClick={toggleDarkMode}
              className={`ml-auto p-2 rounded-full transition-all ${darkMode ? "bg-slate-700 text-yellow-400" : "bg-slate-100 text-slate-600"}`}>
              {darkMode
                ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm9-7a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm14.95 5.657a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 0 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM6.464 6.464a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 5.757 4.343l.707.707a1 1 0 0 1 0 1.414zm12.143-1.414a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM6.464 17.536a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z"/></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
              }
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {currentChat === undefined ? (
              <Welcome darkMode={darkMode} />
            ) : (
              <ChatContainer
                currentChat={currentChat}
                socket={socket}
                darkMode={darkMode}
                onNewMessage={() => {}} // real-time handled by polling
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        className={`md:hidden fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 ${
          darkMode ? "bg-indigo-600 text-white" : "bg-gradient-to-br from-slate-700 to-slate-900 text-white"
        }`}
        onClick={() => setCurrentChat(undefined)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
    </div>
  );
}