import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, UserPlus, Users, Check, X, UserCheck } from "lucide-react";
import api from "../utils/axiosConfig"; // Central API instance

import {
  searchUsersRoute,
  recommendedUsersRoute,
  friendRequestsRoute,
  sendFriendRequestRoute,
  acceptFriendRequestRoute,
  rejectFriendRequestRoute,
} from "../utils/APIRoutes";

export default function FriendsPage() {
  const [search, setSearch] = useState("");
  const [recommended, setRecommended] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("recommended"); // "recommended" | "requests" | "search"
  const [loading, setLoading] = useState({ page: true, search: false });
  const [actionLoading, setActionLoading] = useState({}); // per-user loading
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  const navigate = useNavigate();

  // Read dark mode from localStorage
  const darkMode = localStorage.getItem("chatup-theme") === "dark";

  useEffect(() => {
    const stored = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
    let user = null;
    try { user = stored ? JSON.parse(stored) : null; } catch {}

    if (!user?._id) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        setLoading((p) => ({ ...p, page: true }));
        setError(null);
        const [recRes, reqRes] = await Promise.all([
          api.get(recommendedUsersRoute),
          api.get(friendRequestsRoute),
        ]);
        setRecommended(recRes.data ?? []);
        setRequests(reqRes.data ?? []);
      } catch (err) {
        if (err.response?.status !== 401) {
          setError("Failed to load friends data. Please try again.");
        }
      } finally {
        setLoading((p) => ({ ...p, page: false }));
        setTimeout(() => setMounted(true), 50);
      }
    };

    fetchData();
  }, [navigate]); // Removed 'api' from deps as it's now a static import

  const searchUsers = async (value) => {
    setSearch(value);
    if (value.trim() === "") { setSearchResults([]); return; }

    setLoading((p) => ({ ...p, search: true }));
    try {
      const { data } = await api.get(`${searchUsersRoute}?username=${encodeURIComponent(value)}`);
      setSearchResults(data ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading((p) => ({ ...p, search: false }));
    }
  };

  const sendRequest = async (userId) => {
    setActionLoading((p) => ({ ...p, [userId]: "sending" }));
    try {
      await api.post(sendFriendRequestRoute, { userId });
      setActionLoading((p) => ({ ...p, [userId]: "sent" }));
      setRecommended((prev) => prev.filter((u) => u._id !== userId));
      setSearchResults((prev) => prev.map((u) => u._id === userId ? { ...u, requestSent: true } : u));
    } catch (err) {
      const status = err.response?.status;
      setActionLoading((p) => ({ ...p, [userId]: null }));
      alert(
        status === 409 ? "Request already sent or already friends." :
        status === 400 ? "Cannot send request to yourself." :
        "Failed to send request. Try again."
      );
    }
  };

  const acceptRequest = async (requestId) => {
    setActionLoading((p) => ({ ...p, [requestId]: "accepting" }));
    try {
      await api.post(acceptFriendRequestRoute, { requestId });
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch {
      alert("Failed to accept request.");
    } finally {
      setActionLoading((p) => ({ ...p, [requestId]: null }));
    }
  };

  const rejectRequest = async (requestId) => {
    setActionLoading((p) => ({ ...p, [requestId]: "rejecting" }));
    try {
      await api.post(rejectFriendRequestRoute, { requestId });
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch {
      alert("Failed to reject request.");
    } finally {
      setActionLoading((p) => ({ ...p, [requestId]: null }));
    }
  };

  const dm = darkMode;

  if (loading.page) {
    return (
      <div className={`flex justify-center items-center h-screen ${dm ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className="flex flex-col items-center gap-4">
          <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${dm ? "border-indigo-400" : "border-slate-600"}`} />
          <p className={dm ? "text-slate-400" : "text-slate-500"}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex justify-center items-center h-screen ${dm ? "bg-slate-900" : "bg-slate-50"}`}>
        <div className={`text-center p-8 rounded-2xl max-w-md ${dm ? "bg-slate-800 text-slate-300" : "bg-white shadow text-slate-600"}`}>
          <p className="mb-4">{error}</p>
          <button onClick={() => window.location.reload()}
            className={`px-4 py-2 rounded-lg font-medium ${dm ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-slate-800 text-white hover:bg-slate-700"}`}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "recommended", label: "Suggested", icon: <UserCheck size={15} />, count: recommended.length },
    { id: "requests", label: "Requests", icon: <Users size={15} />, count: requests.length },
    { id: "search", label: "Search", icon: <Search size={15} /> },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dm ? "bg-slate-900" : "bg-gradient-to-br from-slate-50 to-slate-100"}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div
          className="flex items-center gap-4 mb-6"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(-10px)", transition: "all 0.3s ease" }}
        >
          <button
            onClick={() => navigate("/")}
            className={`p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 ${
              dm ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm"
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${dm ? "text-slate-100" : "text-slate-800"}`}>Friends</h1>
            <p className={`text-xs ${dm ? "text-slate-500" : "text-slate-400"}`}>Manage your connections</p>
          </div>
        </div>

        {/* Search bar */}
        <div
          className={`relative mb-5 ${mounted ? "" : "opacity-0"}`}
          style={{ transition: "opacity 0.3s ease 0.1s", opacity: mounted ? 1 : 0 }}
        >
          <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dm ? "text-slate-500" : "text-slate-400"}`} />
          <input
            type="text"
            placeholder="Search by username..."
            value={search}
            onChange={(e) => { searchUsers(e.target.value); if (e.target.value) setActiveTab("search"); }}
            className={`
              w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200
              ${dm
                ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-slate-500"
                : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-400 shadow-sm"
              }
            `}
          />
          {loading.search && (
            <div className={`absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-t-transparent animate-spin ${dm ? "border-slate-400" : "border-slate-500"}`} />
          )}
        </div>

        {/* Tabs */}
        <div
          className={`flex gap-1 mb-5 p-1 rounded-xl ${dm ? "bg-slate-800" : "bg-white shadow-sm"}`}
          style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease 0.15s" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold
                transition-all duration-200
                ${activeTab === tab.id
                  ? dm ? "bg-slate-700 text-slate-100" : "bg-slate-900 text-white shadow-sm"
                  : dm ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? "bg-white/20 text-white" : dm ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease 0.2s" }}>
          {activeTab === "search" && (
            <div className="space-y-2">
              {!loading.search && search.trim() && searchResults.length === 0 && (
                <div className={`text-center py-12 ${dm ? "text-slate-500" : "text-slate-400"}`}>
                  <Search size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No users found for "{search}"</p>
                </div>
              )}
              {!search.trim() && (
                <div className={`text-center py-12 ${dm ? "text-slate-600" : "text-slate-400"}`}>
                  <Search size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Type a username to search</p>
                </div>
              )}
              {searchResults.map((user, i) => (
                <UserCard
                  key={user._id}
                  user={user}
                  dm={dm}
                  delay={i * 50}
                  actionState={user.requestSent ? "sent" : actionLoading[user._id]}
                  primaryAction={() => sendRequest(user._id)}
                  primaryLabel="Add Friend"
                  primaryIcon={<UserPlus size={14} />}
                  color="blue"
                />
              ))}
            </div>
          )}

          {activeTab === "recommended" && (
            <div className="space-y-2">
              {recommended.length === 0 ? (
                <EmptyState dm={dm} icon={<UserCheck size={28} />} text="No suggestions right now" sub="Check back later!" />
              ) : (
                recommended.map((user, i) => (
                  <UserCard
                    key={user._id}
                    user={user}
                    dm={dm}
                    delay={i * 50}
                    actionState={actionLoading[user._id]}
                    primaryAction={() => sendRequest(user._id)}
                    primaryLabel="Add"
                    primaryIcon={<UserPlus size={14} />}
                    color="green"
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "requests" && (
            <div className="space-y-2">
              {requests.length === 0 ? (
                <EmptyState dm={dm} icon={<Users size={28} />} text="No pending requests" sub="You're all caught up!" />
              ) : (
                requests.map((req, i) => (
                  <RequestCard
                    key={req._id}
                    req={req}
                    dm={dm}
                    delay={i * 50}
                    acceptLoading={actionLoading[req._id] === "accepting"}
                    rejectLoading={actionLoading[req._id] === "rejecting"}
                    onAccept={() => acceptRequest(req._id)}
                    onReject={() => rejectRequest(req._id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components stay exactly the same
function UserCard({ user, dm, delay, actionState, primaryAction, primaryLabel, primaryIcon, color }) {
  const colorMap = {
    blue: dm ? "bg-indigo-600 hover:bg-indigo-500" : "bg-slate-800 hover:bg-slate-700",
    green: dm ? "bg-emerald-600 hover:bg-emerald-500" : "bg-emerald-700 hover:bg-emerald-600",
  };

  const isSending = actionState === "sending";
  const isSent = actionState === "sent";

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
        dm ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800" : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        {user.avatarImage ? (
          <img
            src={`data:image/svg+xml;base64,${user.avatarImage}`}
            alt={user.username}
            className="w-10 h-10 rounded-full ring-2 ring-slate-300/30"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${dm ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
            {user.username?.[0]?.toUpperCase()}
          </div>
        )}
        <span className={`font-medium text-sm ${dm ? "text-slate-200" : "text-slate-800"}`}>{user.username}</span>
      </div>

      {isSent ? (
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${dm ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
          <Check size={12} /> Sent
        </span>
      ) : (
        <button
          onClick={primaryAction}
          disabled={isSending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${colorMap[color]}`}
        >
          {isSending ? (
            <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            primaryIcon
          )}
          {isSending ? "Sending..." : primaryLabel}
        </button>
      )}
    </div>
  );
}

function RequestCard({ req, dm, delay, acceptLoading, rejectLoading, onAccept, onReject }) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
        dm ? "bg-slate-800/60 border-slate-700/50" : "bg-white border-slate-200/80 shadow-sm"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        {req.from?.avatarImage ? (
          <img
            src={`data:image/svg+xml;base64,${req.from.avatarImage}`}
            alt={req.from.username}
            className="w-10 h-10 rounded-full ring-2 ring-slate-300/30"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${dm ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-500"}`}>
            {req.from?.username?.[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <span className={`font-medium text-sm block ${dm ? "text-slate-200" : "text-slate-800"}`}>{req.from?.username}</span>
          <span className={`text-xs ${dm ? "text-slate-500" : "text-slate-400"}`}>
            {new Date(req.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onAccept}
          disabled={acceptLoading || rejectLoading}
          className={`p-2 rounded-full text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
            dm ? "bg-emerald-600 hover:bg-emerald-500" : "bg-emerald-600 hover:bg-emerald-500"
          }`}
          title="Accept"
        >
          {acceptLoading
            ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Check size={16} />
          }
        </button>
        <button
          onClick={onReject}
          disabled={acceptLoading || rejectLoading}
          className={`p-2 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
            dm ? "bg-slate-700 text-slate-400 hover:bg-slate-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
          title="Reject"
        >
          {rejectLoading
            ? <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            : <X size={16} />
          }
        </button>
      </div>
    </div>
  );
}

function EmptyState({ dm, icon, text, sub }) {
  return (
    <div className={`text-center py-16 ${dm ? "text-slate-500" : "text-slate-400"}`}>
      <div className="mx-auto mb-3 opacity-40 flex justify-center">{icon}</div>
      <p className="font-medium text-sm">{text}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
    </div>
  );
}