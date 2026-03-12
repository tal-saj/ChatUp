// Welcome.jsx
import React, { useState, useEffect } from "react";
import Robot from "../assets/robot.gif"; // or replace with Lottie / better animation

export default function Welcome() {
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
      // Small delay for smooth entrance
      setTimeout(() => setIsLoaded(true), 400);
    }
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-white px-6 py-12 text-center overflow-hidden">

      {/* Very subtle background orbs – almost invisible */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-slate-200/30 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-slate-300/20 blur-3xl animate-pulse animation-delay-2000" />
      </div>

      <div
        className={`
          relative z-10 flex flex-col items-center gap-8 md:gap-10
          transition-all duration-800 ease-out
          ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}
        `}
      >
        {/* Robot / welcome graphic */}
        <div className="relative group">
          <img
            src={Robot}
            alt="Welcome animation"
            className={`
              h-48 w-auto max-w-[85vw] md:h-64 lg:h-72
              object-contain drop-shadow-xl transition-all duration-500
              group-hover:scale-105 group-hover:drop-shadow-2xl
            `}
          />

          {/* Soft ambient glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-slate-300/20 to-slate-400/10 blur-2xl -z-10 animate-pulse-slow pointer-events-none" />
        </div>

        {/* Welcome message */}
        <div className="space-y-5 md:space-y-7">
          <h1
            className={`
              text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight
              text-slate-800
              transition-all duration-700
            `}
          >
            Welcome back,
            <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              {userName || "Friend"}!
            </span>
          </h1>

          <h3 className="text-xl sm:text-2xl md:text-2.5xl text-slate-600 font-light tracking-wide">
            Select a conversation to start chatting
          </h3>
        </div>

        {/* Subtle hint */}
        <div className="mt-8">
          <p className="text-base md:text-lg text-slate-500/90 italic font-light">
            Your friends are waiting...
          </p>
        </div>
      </div>
    </div>
  );
}