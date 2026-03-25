import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 px-6 py-3 flex gap-4 border-b border-gray-200">
      <button
        onClick={() => navigate("/")}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          location.pathname === "/" 
            ? "bg-blue-600 text-white shadow-md" 
            : "text-blue-600 hover:bg-blue-50 hover:shadow-sm"
        }`}
      >
        💬 Chat
      </button>
      <button
        onClick={() => navigate("/friends")}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          location.pathname === "/friends" 
            ? "bg-blue-600 text-white shadow-md" 
            : "text-blue-600 hover:bg-blue-50 hover:shadow-sm"
        }`}
      >
        👥 Friends
      </button>
    </div>
  );
}