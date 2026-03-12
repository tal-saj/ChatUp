// Contacts.jsx
import React, { useState, useEffect } from "react";
import Logo from "../assets/logo.svg";

export default function Contacts({ contacts, changeChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);

  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
      );

      if (data?.username && data?.avatarImage) {
        setCurrentUserName(data.username);
        setCurrentUserImage(data.avatarImage);
      }
    } catch (err) {
      console.error("Failed to load current user:", err);
    }
  }, []);

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  if (!currentUserName || !currentUserImage) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-gray-950">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-black">

      {/* Logo / Brand */}
      <div className="shrink-0 flex items-center justify-center gap-3 py-5 px-4 border-b border-gray-800/50">
        <img src={Logo} alt="ChatUp" className="h-8 w-auto" />
        <h3 className="text-xl font-bold tracking-tight text-white">
          ChatUp
        </h3>
      </div>

      {/* Contacts list */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {contacts.map((contact, index) => {
          const isSelected = index === currentSelected;

          return (
            <div
              key={contact._id}
              onClick={() => changeCurrentChat(index, contact)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  changeCurrentChat(index, contact);
                }
              }}
              className={`
                group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer
                transition-all duration-200
                ${
                  isSelected
                    ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 shadow-md shadow-indigo-900/20"
                    : "hover:bg-gray-800/60 active:bg-gray-700/70"
                }
                focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-gray-950
              `}
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`
                    h-12 w-12 rounded-full overflow-hidden ring-2 transition-all
                    ${
                      isSelected
                        ? "ring-indigo-500 ring-offset-2 ring-offset-gray-950"
                        : "ring-gray-700/50 group-hover:ring-gray-600"
                    }
                  `}
                >
                  <img
                    src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                    alt={`${contact.username}'s avatar`}
                    className="h-full w-full object-cover"
                    onError={(e) => (e.target.src = "/fallback-avatar.png")}
                  />
                </div>

                {/* Optional online status dot – can be wired later */}
                {/* <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-gray-950"></span> */}
              </div>

              <div className="min-w-0 flex-1">
                <h3
                  className={`
                    font-medium truncate
                    ${isSelected ? "text-white" : "text-gray-200 group-hover:text-white"}
                  `}
                >
                  {contact.username}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current user – bottom bar */}
      <div className="shrink-0 border-t border-gray-800/50 bg-gray-900/70 backdrop-blur-sm px-4 py-4 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-purple-500/40 ring-offset-2 ring-offset-gray-950">
            <img
              src={`data:image/svg+xml;base64,${currentUserImage}`}
              alt="Your avatar"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="min-w-0">
          <h2 className="font-semibold text-white truncate">
            {currentUserName}
          </h2>
          <p className="text-xs text-gray-400">You</p>
        </div>

        {/* Optional: settings / logout icon here later */}
        {/* <button className="ml-auto p-2 rounded-full hover:bg-gray-800/60">
          <Settings size={20} className="text-gray-400" />
        </button> */}
      </div>
    </div>
  );
}