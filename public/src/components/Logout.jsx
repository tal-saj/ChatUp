// components/Logout.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Loader2 } from "lucide-react";
import { logoutRoute } from "../utils/APIRoutes";
import api from "../utils/axiosConfig";

export default function Logout({ darkMode }) {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const userData = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY) || "{}"
      );
      if (!userData?._id) {
        localStorage.clear();
        navigate("/login");
        return;
      }
      const response = await api.post(logoutRoute, { userId: userData._id });
      if (response.status === 200 || response.data?.success) {
        localStorage.clear();
        navigate("/login");
      } else {
        console.warn("Logout may have failed:", response.data);
      }
    } catch (error) {
      console.error("Logout error:", error);
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
        relative flex h-9 w-9 items-center justify-center rounded-full
        transition-all duration-200 ease-out
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
        ${darkMode
          ? "bg-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-600 focus:ring-slate-500 focus:ring-offset-slate-800"
          : "bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 border border-slate-200/70 focus:ring-slate-300 focus:ring-offset-white shadow-sm"
        }
      `}
    >
      {isLoggingOut ? (
        <Loader2 size={17} className="animate-spin" />
      ) : (
        <LogOut size={17} />
      )}
      {isLoggingOut && (
        <span className="absolute inset-0 rounded-full bg-slate-300/30 animate-ping pointer-events-none" />
      )}
    </button>
  );
}
