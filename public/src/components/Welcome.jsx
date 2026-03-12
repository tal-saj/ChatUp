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
      // Small delay for entrance animation
      setTimeout(() => setIsLoaded(true), 300);
    }
  }, []);

  return (
    <div
      className={`
        relative flex min-h-screen w-full flex-col items-center justify-center
        bg-gradient-to-br from-gray-950 via-indigo-950/40 to-purple-950/30
        px-6 py-12 text-center overflow-hidden
      `}
    >
      {/* Optional subtle animated background blobs */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl animate-blob" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div
        className={`
          relative z-10 flex flex-col items-center gap-8 md:gap-10
          transition-all duration-700 transform
          ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
        `}
      >
        {/* Robot / welcome animation */}
        <div className="relative">
          <img
            src={Robot}
            alt="Welcome animation"
            className={`
              h-48 w-auto max-w-[85vw] md:h-64 lg:h-72
              object-contain drop-shadow-2xl
              transition-transform duration-500 hover:scale-105
            `}
          />

          {/* Optional subtle glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl -z-10 animate-pulse-slow" />
        </div>

        {/* Welcome text */}
        <div className="space-y-4 md:space-y-6">
          <h1
            className={`
              text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight
              bg-gradient-to-r from-white via-indigo-300 to-purple-300 bg-clip-text text-transparent
              animate-fade-in-up
            `}
          >
            Welcome back,
            <br className="sm:hidden" />
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              {userName || "Friend"}!
            </span>
          </h1>

          <h3
            className={`
              text-lg sm:text-xl md:text-2xl text-gray-300 font-light
              opacity-90 animate-fade-in-up animation-delay-400
            `}
          >
            Select a conversation to start chatting
          </h3>
        </div>

        {/* Optional subtle hint / call-to-action */}
        <div className="mt-6 animate-fade-in-up animation-delay-800">
          <p className="text-sm md:text-base text-gray-400/80 italic">
            Your friends are waiting...
          </p>
        </div>
      </div>
    </div>
  );
}