// pages/Chat.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { allUsersRoute, uploadKeyRoute, heartbeatRoute, unreadCountsRoute } from "../utils/APIRoutes";
import { generateAndStoreKeyPair, hasKeyPair, getStoredPublicKeyJwk } from "../utils/crypto";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import IncomingCallBanner from "../components/IncomingCallBanner";
import ActiveCall from "../components/ActiveCall";
import { useWebRTC } from "../hooks/useWebRTC";
import api from "../utils/axiosConfig";

const isOnline = (lastSeen) => {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 45_000;
};

export default function Chat() {
  const navigate = useNavigate();
  const heartbeatTimer         = useRef(null);
  const unreadTimer            = useRef(null);
  const contactsRefreshTimer   = useRef(null);

  const [contacts,     setContacts]     = useState([]);
  const [currentChat,  setCurrentChat]  = useState(undefined);
  const [currentUser,  setCurrentUser]  = useState(undefined);
  const [isLoading,    setIsLoading]    = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [unreadSince,  setUnreadSince]  = useState(new Date().toISOString());
  const [mobileView,   setMobileView]   = useState("contacts"); // "contacts" | "chat"

  // ── Call state ───────────────────────────────────────────────────────────────
  const [activeCall,    setActiveCall]    = useState(null);   // { contact, callType }
  const [remoteStream,  setRemoteStream]  = useState(null);   // MediaStream from remote peer
  const [callActive,    setCallActive]    = useState(false);  // is a call in progress?
  const [callerStatus,  setCallerStatus]  = useState(null);   // "ringing" | null — shown to caller while waiting

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

  // ── WebRTC hook ──────────────────────────────────────────────────────────────
  const { startCall, acceptCall, rejectCall, hangup, setMuted } = useWebRTC({
    onRemoteStream: (stream) => {
      console.log("[Chat] Remote stream received, setting state");
      setRemoteStream(stream);
    },
    onCallEnded: (reason) => {
      console.log("[Chat] Call ended:", reason);
      setActiveCall(null);
      setRemoteStream(null);
      setCallActive(false);
      setCallerStatus(null);
    },
  });

  // ── Outgoing call ────────────────────────────────────────────────────────────
  const handleStartCall = useCallback(async ({ contact, callType = "audio" }) => {
    // Guard: already in a call
    if (callActive) return;

    try {
      // Set active state BEFORE startCall so IncomingCallBanner unmounts
      // and won't surface a stale incoming call mid-setup
      setActiveCall({ contact, callType });
      setCallActive(true);
      setCallerStatus("ringing");

      await startCall({ calleeId: contact._id, callType });
    } catch (err) {
      // Rollback if setup fails
      setActiveCall(null);
      setCallActive(false);
      setCallerStatus(null);
      alert(
        err?.name === "NotAllowedError"
          ? "Microphone access denied. Please allow it in browser settings."
          : "Could not start the call. Please try again."
      );
    }
  }, [callActive, startCall]);

  // ── Accept incoming call ─────────────────────────────────────────────────────
  const handleAcceptCall = useCallback(async (incomingCall) => {
    if (callActive) return; // already in a call — banner shouldn't show but guard anyway

    try {
      setActiveCall({ contact: incomingCall.caller, callType: incomingCall.callType });
      setCallActive(true);

      await acceptCall({
        callId: incomingCall.callId,
        offer: incomingCall.offer,
        callType: incomingCall.callType,
      });
    } catch (err) {
      setActiveCall(null);
      setCallActive(false);
      alert(
        err?.name === "NotAllowedError"
          ? "Microphone access denied. Please allow it in browser settings."
          : "Could not accept the call. Please try again."
      );
    }
  }, [callActive, acceptCall]);

  // ── Reject incoming call ─────────────────────────────────────────────────────
  const handleRejectCall = useCallback(async (incomingCall) => {
    await rejectCall(incomingCall.callId);
    // No state change needed — we weren't in a call
  }, [rejectCall]);

  // ── Hang up ──────────────────────────────────────────────────────────────────
  const handleHangup = useCallback(async () => {
    await hangup("ended");
    // onCallEnded callback above resets all state
  }, [hangup]);

  // ── 1. Load current user ─────────────────────────────────────────────────────
  useEffect(() => {
    const userData = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
    if (!userData) { navigate("/login"); return; }
    try {
      const parsed = JSON.parse(userData);
      if (parsed?._id) { setCurrentUser(parsed); }
      else { localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY); navigate("/login"); }
    } catch {
      localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY); navigate("/login");
    }
  }, [navigate]);

  // ── 2. Key setup — generate once, re-upload on every login ──────────────────
  useEffect(() => {
    if (!currentUser) return;
    const setup = async () => {
      setIsLoading(true);
      if (!currentUser.isAvatarImageSet) { navigate("/setAvatar"); return; }

      let publicKeyToUpload;
      if (!hasKeyPair()) {
        const { publicJwk } = await generateAndStoreKeyPair();
        publicKeyToUpload = JSON.stringify(publicJwk);
      } else {
        publicKeyToUpload = getStoredPublicKeyJwk();
      }

      if (publicKeyToUpload) {
        try {
          await api.post(uploadKeyRoute, { userId: currentUser._id, publicKey: publicKeyToUpload });
        } catch (err) { console.error("Key upload failed:", err); }
      }

      try {
        const { data } = await api.get(`${allUsersRoute}/${currentUser._id}`);
        setContacts(data || []);
      } catch (err) { console.error("Failed to load contacts:", err); }
      finally { setIsLoading(false); }
    };
    setup();
  }, [currentUser, navigate]);

  // ── 3. Heartbeat every 30s ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const beat = () => api.post(heartbeatRoute, { userId: currentUser._id }).catch(() => {});
    beat();
    heartbeatTimer.current = setInterval(beat, 30_000);
    return () => clearInterval(heartbeatTimer.current);
  }, [currentUser]);

  // ── 4. Contacts refresh every 10s ────────────────────────────────────────────
  const refreshContacts = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data } = await api.get(`${allUsersRoute}/${currentUser._id}`);
      setContacts(data || []);
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    contactsRefreshTimer.current = setInterval(refreshContacts, 10_000);
    return () => clearInterval(contactsRefreshTimer.current);
  }, [currentUser, refreshContacts]);

  // ── 5. Unread counts every 5s ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const fetchUnread = async () => {
      try {
        const { data } = await api.post(unreadCountsRoute, {
          userId: currentUser._id,
          since: unreadSince,
        });
        if (Object.keys(data).length > 0) {
          setUnreadCounts((prev) => {
            const merged = { ...prev };
            Object.entries(data).forEach(([sid, count]) => { merged[sid] = (merged[sid] || 0) + count; });
            return merged;
          });
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

  // ── 6. Notification permission ───────────────────────────────────────────────
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── 7. Inactivity logout at 30min ────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const TIMEOUT = 30 * 60 * 1000;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
        navigate("/login");
      }, TIMEOUT);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [currentUser, navigate]);

  // ── Chat / mobile handlers ───────────────────────────────────────────────────
  const handleChatChange = (chat) => {
    setCurrentChat(chat);
    refreshContacts(); // immediate online status refresh
    if (chat?._id) {
      setUnreadCounts((prev) => { const next = { ...prev }; delete next[chat._id]; return next; });
    }
    setMobileView("chat");
  };

  const handleMobileBack = () => {
    setMobileView("contacts");
    setCurrentChat(undefined);
  };

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (isLoading || !currentUser) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center ${darkMode ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="flex flex-col items-center gap-5">
          <div className="h-12 w-12 rounded-full border-4 border-slate-300 border-t-indigo-500/70 animate-spin" />
          <p className={`font-medium tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Setting up secure session…
          </p>
        </div>
      </div>
    );
  }

  const contactsWithStatus = contacts.map((c) => ({ ...c, online: isOnline(c.lastSeen) }));

  const DarkToggleIcon = darkMode
    ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1zm9-7a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1zm14.95 5.657a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 0 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM6.464 6.464a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 5.757 4.343l.707.707a1 1 0 0 1 0 1.414zm12.143-1.414a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM6.464 17.536a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z"/></svg>
    : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>;

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden transition-colors duration-300 ${
      darkMode ? "bg-slate-950" : "bg-gradient-to-br from-slate-100 via-slate-50 to-white"
    }`}>

      {/* ── Incoming call banner — only shown when NOT already in a call ── */}
      {!callActive && (
        <IncomingCallBanner
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          darkMode={darkMode}
        />
      )}

      {/* ── Active call overlay ── */}
      {callActive && activeCall && (
        <ActiveCall
          contact={activeCall.contact}
          callType={activeCall.callType}
          remoteStream={remoteStream}
          callerStatus={callerStatus}
          onHangup={handleHangup}
          onMuteChange={setMuted}
          darkMode={darkMode}
        />
      )}

      <div className={`
        relative flex w-full max-w-[1800px] mx-auto h-full
        shadow-2xl overflow-hidden transition-all duration-500
        md:rounded-2xl
        ${darkMode
          ? "border border-slate-700/50 bg-slate-900 shadow-black/40"
          : "border border-slate-200/70 bg-white/60 backdrop-blur-xl shadow-slate-300/40"
        }
      `}>

        {/* ── DESKTOP: sidebar ── */}
        <aside className={`
          hidden md:flex md:w-80 lg:w-96 flex-shrink-0 flex-col
          border-r transition-all duration-300
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

        {/* ── DESKTOP: main ── */}
        <main className={`hidden md:flex flex-1 flex-col min-w-0 ${
          darkMode
            ? "bg-[#0f172a]"
            : "bg-gradient-to-br from-blue-50/40 via-slate-50 to-indigo-50/30"
        }`}>
          {currentChat === undefined ? (
            <Welcome darkMode={darkMode} />
          ) : (
            <ChatContainer
              currentChat={currentChat}
              darkMode={darkMode}
              onCall={handleStartCall}
              callDisabled={callActive}
            />
          )}
        </main>

        {/* ── MOBILE: contacts view (slides from left) ── */}
        <div className={`
          md:hidden absolute inset-0 flex flex-col
          transition-transform duration-300 ease-in-out will-change-transform
          ${mobileView === "contacts" ? "translate-x-0" : "-translate-x-full"}
        `}>
          <Contacts
            contacts={contactsWithStatus}
            changeChat={handleChatChange}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            unreadCounts={unreadCounts}
          />
        </div>

        {/* ── MOBILE: chat view (slides from right) ── */}
        <div className={`
          md:hidden absolute inset-0 flex flex-col
          transition-transform duration-300 ease-in-out will-change-transform
          ${mobileView === "chat" ? "translate-x-0" : "translate-x-full"}
          ${darkMode ? "bg-[#0f172a]" : "bg-gradient-to-br from-blue-50/40 via-slate-50 to-indigo-50/30"}
        `}>
          {/* Mobile back header */}
          {currentChat && (
            <div className={`
              flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b
              ${darkMode ? "bg-slate-800/90 border-slate-700/60" : "bg-white/90 backdrop-blur-xl border-slate-200/60 shadow-sm"}
            `}>
              <button
                onClick={handleMobileBack}
                className={`p-2 rounded-full transition-all hover:scale-105 active:scale-95 ${
                  darkMode ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="h-9 w-9 rounded-full overflow-hidden">
                    <img src={`data:image/svg+xml;base64,${currentChat.avatarImage}`} alt={currentChat.username} className="h-full w-full object-cover" />
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ${
                    currentChat.online
                      ? darkMode ? "bg-emerald-500 ring-slate-800" : "bg-emerald-500 ring-white"
                      : darkMode ? "bg-slate-600 ring-slate-800" : "bg-slate-300 ring-white"
                  }`} />
                </div>
                <div className="min-w-0">
                  <h2 className={`font-semibold truncate text-sm ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{currentChat.username}</h2>
                  <p className={`text-xs ${currentChat.online ? "text-emerald-500" : darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    {currentChat.online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>

              <button
                onClick={toggleDarkMode}
                className={`flex-shrink-0 p-2 rounded-full transition-all ${darkMode ? "bg-slate-700 text-yellow-400" : "bg-slate-100 text-slate-600"}`}
              >
                {DarkToggleIcon}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {currentChat ? (
              <ChatContainer
                currentChat={currentChat}
                darkMode={darkMode}
                onCall={handleStartCall}
                callDisabled={callActive}
              />
            ) : (
              <Welcome darkMode={darkMode} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
