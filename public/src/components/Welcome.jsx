// Welcome.jsx
import React, { useState, useEffect } from "react";
import Robot from "../assets/robot.gif";

export default function Welcome({ darkMode }) {
  const [userName, setUserName] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed?.username) {
          setUserName(parsed.username);
        }
      }
    } catch (err) {
      console.error("Failed to load username:", err);
    } finally {
      setTimeout(() => setIsLoaded(true), 300);
    }
  }, []);

  return (
    <div className={`
      relative flex h-full w-full flex-col items-center justify-center
      px-6 py-12 text-center overflow-hidden
      transition-colors duration-300
      ${darkMode
        ? "bg-slate-900"
        : "bg-gradient-to-br from-slate-50 via-slate-100 to-white"
      }
    `}>

      {/* Background orbs */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className={`absolute -left-20 -top-20 h-80 w-80 rounded-full blur-3xl animate-pulse ${darkMode ? "bg-indigo-500/20" : "bg-slate-300/30"}`} />
        <div className={`absolute -right-20 bottom-10 h-80 w-80 rounded-full blur-3xl ${darkMode ? "bg-slate-600/20" : "bg-slate-200/20"}`} />
      </div>

      <div
        className="relative z-10 flex flex-col items-center gap-8"
        style={{
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <div className="relative group">
          <img
            src={Robot}
            alt="Welcome"
            className="h-44 w-auto max-w-[80vw] object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
          />
          <div className={`absolute inset-0 rounded-full blur-2xl -z-10 animate-pulse ${darkMode ? "bg-indigo-500/10" : "bg-slate-300/20"}`} />
        </div>

        <div className="space-y-4">
          <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
            Welcome back,{" "}
            <span className={darkMode ? "text-indigo-400" : "bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent"}>
              {userName || "Friend"}!
            </span>
          </h1>

          <h3 className={`text-lg font-light tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Select a conversation to start chatting
          </h3>
        </div>

        <p className={`text-sm italic font-light ${darkMode ? "text-slate-600" : "text-slate-400/80"}`}>
          Your friends are waiting...
        </p>
      </div>
    </div>
  );
}
