// Contacts.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../assets/logo.svg";
import Logout from "./Logout";


export default function Contacts({ contacts, changeChat }) {
  const navigate = useNavigate();

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
      <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-3 border-slate-300 border-t-slate-500 animate-spin" />
          <p className="text-sm font-medium">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-50 via-slate-100 to-white">

    {/* Logo / Brand header */}
<div className="
  shrink-0 flex items-center justify-center gap-3 py-5 px-4
  border-b border-slate-200/70 bg-white/60 backdrop-blur-xl
  shadow-sm
">

{/* Friends Page Link */}
<button
  onClick={() => navigate("/friends")}
  className="absolute left-4 text-sm font-medium text-blue-600 hover:underline"
>
  Friends
</button>

  <img 
    src={Logo} 
    alt="ChatUp" 
    className="h-8 w-auto drop-shadow-sm transition-transform hover:scale-105" 
  />
  <h3 className="text-xl font-bold tracking-tight text-slate-800">
    ChatUp
  </h3>
</div>

      {/* Contacts list */}
      <div className="
        flex-1 overflow-y-auto px-3 py-4 space-y-2.5
        scrollbar-thin scrollbar-thumb-slate-300/70 scrollbar-track-transparent
        scrollbar-thumb-rounded-full
      ">
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
                group flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer
                transition-all duration-250 ease-out
                ${
                  isSelected
                    ? "bg-white border border-slate-300/80 shadow-md shadow-slate-400/30 scale-[1.015]"
                    : "hover:bg-white/80 active:bg-slate-100/70 hover:shadow-sm"
                }
                focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:ring-offset-2 focus:ring-offset-slate-50
              `}
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`
                    h-12 w-12 rounded-full overflow-hidden ring-2 transition-all duration-200
                    ${
                      isSelected
                        ? "ring-slate-500 ring-offset-2 ring-offset-white shadow-inner"
                        : "ring-slate-300/60 group-hover:ring-slate-400"
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

                {/* Optional online dot – can be added later when online status is implemented */}
                {/* <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"></span> */}
              </div>

              <div className="min-w-0 flex-1">
                <h3
                  className={`
                    font-medium truncate text-base
                    ${isSelected ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"}
                  `}
                >
                  {contact.username}
                </h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current user – bottom fixed bar */}
<div className="
  shrink-0 border-t border-slate-200/70
  bg-white/70 backdrop-blur-xl px-4 py-4
  flex items-center gap-3.5 shadow-sm
">

  <div className="relative flex-shrink-0">
    <div className="
      h-12 w-12 rounded-full overflow-hidden 
      ring-2 ring-slate-400/50 ring-offset-2 ring-offset-white
      shadow-sm
    ">
      <img
        src={`data:image/svg+xml;base64,${currentUserImage}`}
        alt="Your avatar"
        className="h-full w-full object-cover"
      />
    </div>
  </div>

  <div className="min-w-0 flex-1">
    <h2 className="font-semibold text-slate-900 truncate">
      {currentUserName}
    </h2>
    <p className="text-xs text-slate-500 font-medium">You</p>
  </div>

  {/* Logout Button */}
  <div className="flex-shrink-0">
    <Logout />
  </div>



        {/* Optional: settings icon or more actions */}
        {/* <button className="ml-auto p-2.5 rounded-full hover:bg-slate-100 transition-colors">
          <Settings size={20} className="text-slate-500" />
        </button> */}
      </div>
    </div>
  );
}