// Logout.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Loader2 } from "lucide-react";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";

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

      // If no user → just clear and redirect (edge case)
      if (!userData?._id) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      // POST is more correct for logout (session invalidation)
      const response = await axios.post(logoutRoute, {
        userId: userData._id,
      });

      // Adjust condition based on your actual backend response
      if (response.status === 200 || response.data?.success) {
        localStorage.clear();
        navigate("/login");
      } else {
        console.warn("Logout unsuccessful:", response.data);
        // Optional: toast.error("Logout failed. Please try again.")
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Optional: toast.error("Something went wrong. Please try again.")
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
        bg-gradient-to-br from-gray-800 to-gray-900
        text-gray-300 hover:text-white
        transition-all duration-200
        hover:scale-110 hover:shadow-lg hover:shadow-purple-900/30
        focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-950
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
      `}
    >
      {isLoggingOut ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <LogOut size={20} />
      )}

      {/* Optional micro pulse animation while logging out */}
      {isLoggingOut && (
        <span className="absolute inset-0 rounded-full bg-purple-600/20 animate-ping" />
      )}
    </button>
  );
}