// Logout.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Loader2 } from "lucide-react";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";
import api from "../utils/axiosConfig";

export default function Logout() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const userData = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY) || "{}"
      );

      // Edge case: no user data → just clear & redirect
      if (!userData?._id) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      // POST request to invalidate session (recommended)
      const response = await api.post(logoutRoute, { userId: userData._id });

      // Adjust based on your backend response structure
      if (response.status === 200 || response.data?.success) {
        localStorage.clear();
        navigate("/login");
      } else {
        console.warn("Logout may have failed:", response.data);
        // Optional: toast.warning("Logout incomplete. You may need to close the tab.")
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Optional: toast.error("Could not log out. Please try again.")
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Log out"
      title="Log out"
      className={`
        relative flex h-10 w-10 items-center justify-center rounded-full
        bg-white/80 backdrop-blur-sm border border-slate-200/70
        text-slate-600 hover:text-slate-800
        shadow-sm hover:shadow-md hover:shadow-slate-300/40
        transition-all duration-200 ease-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:ring-offset-2 focus:ring-offset-white
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-sm
      `}
    >
      {isLoggingOut ? (
        <Loader2 size={20} className="animate-spin text-slate-500" />
      ) : (
        <LogOut size={20} />
      )}

      {/* Subtle ripple effect during logout */}
      {isLoggingOut && (
        <span className="absolute inset-0 rounded-full bg-slate-300/30 animate-ping pointer-events-none" />
      )}
    </button>
  );
}