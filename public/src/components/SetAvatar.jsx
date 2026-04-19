// SetAvatar.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/axiosConfig";
import { Buffer } from "buffer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { setAvatarRoute } from "../utils/APIRoutes";
import multiavatar from "@multiavatar/multiavatar/esm";

export default function SetAvatar() {
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toastOptions = useMemo(
    () => ({
      position: "bottom-right",
      autoClose: 5000,
      pauseOnHover: true,
      draggable: true,
      theme: "light",
      toastClassName: "!rounded-xl !shadow-lg !border !border-slate-200",
    }),
    []
  );

  // Protect route
  useEffect(() => {
    if (!localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)) {
      navigate("/login");
    }
  }, [navigate]);

  // Generate random avatars
  useEffect(() => {
    const generateAvatars = async () => {
      try {
        const avatarData = [];

        for (let i = 0; i < 4; i++) {
          const seed = Math.random().toString(36).substring(2);
          const svg = multiavatar(seed);
          const base64 = Buffer.from(svg).toString("base64");
          avatarData.push(base64);
        }

        setAvatars(avatarData);
      } catch (err) {
        console.error("Avatar generation failed", err);
        toast.error("Couldn't generate avatars", toastOptions);
      } finally {
        setIsLoading(false);
      }
    };

    generateAvatars();
  }, [toastOptions]);

  const setProfilePicture = async () => {
    if (selectedAvatar === undefined) {
      toast.error("Please select an avatar", toastOptions);
      return;
    }

    setIsSubmitting(true);

    try {
      const user = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY) || "{}"
      );

      if (!user?._id) {
        toast.error("Session expired. Please log in again.", toastOptions);
        navigate("/login");
        return;
      }

      const { data } = await api.post(`${setAvatarRoute}/${user._id}`, {
        image: avatars[selectedAvatar],
      }); 

      if (data.isSet) {
        const updatedUser = {
          ...user,
          isAvatarImageSet: true,
          avatarImage: data.image,
        };

        localStorage.setItem(
          process.env.REACT_APP_LOCALHOST_KEY,
          JSON.stringify(updatedUser)
        );

        toast.success("Profile picture set!", toastOptions);
        navigate("/");
      } else {
        toast.error("Failed to update avatar", toastOptions);
      }
    } catch (error) {
      console.error("Set avatar error:", error);
      toast.error(
        error.response?.data?.message || "Something went wrong",
        toastOptions
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white flex items-center justify-center p-6">

      <div className="
        w-full max-w-2xl 
        bg-white/40 backdrop-blur-2xl border border-slate-200/70
        rounded-3xl shadow-2xl shadow-slate-300/30
        p-8 md:p-12
        flex flex-col items-center gap-10
        transition-all duration-500
      ">

        {isLoading ? (
          <div className="flex flex-col items-center gap-6 py-20">
            <div className="h-16 w-16 rounded-full border-4 border-slate-300 border-t-slate-600 animate-spin" />
            <p className="text-slate-500 text-lg font-medium">
              Preparing your avatar options...
            </p>
          </div>
        ) : (
          <>
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 text-center tracking-tight">
              Choose Your Profile Picture
            </h1>

            {/* Avatars grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-10 my-6">
              {avatars.map((avatar, index) => {
                const isSelected = selectedAvatar === index;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedAvatar(index)}
                    className={`
                      group relative flex flex-col items-center gap-3
                      transition-all duration-300
                      focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:ring-offset-4 focus:ring-offset-white
                    `}
                    aria-label={`Select avatar ${index + 1}`}
                  >
                    <div
                      className={`
                        relative rounded-full p-3 transition-all duration-300
                        ${
                          isSelected
                            ? "bg-white border-4 border-slate-500/70 ring-4 ring-slate-300/40 shadow-xl shadow-slate-400/40 scale-110"
                            : "bg-white/70 border-2 border-slate-300/60 hover:border-slate-400 hover:shadow-lg hover:scale-105"
                        }
                      `}
                    >
                      <img
                        src={`data:image/svg+xml;base64,${avatar}`}
                        alt={`Avatar option ${index + 1}`}
                        className="h-24 w-24 md:h-28 md:w-28 rounded-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>

                    {isSelected && (
                      <span className="
                        absolute -bottom-3 text-xs font-semibold 
                        px-3 py-1 bg-slate-700 text-white rounded-full 
                        shadow-md shadow-slate-500/30
                      ">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submit button */}
            <button
              onClick={setProfilePicture}
              disabled={selectedAvatar === undefined || isSubmitting}
              className={`
                min-w-[240px] px-8 py-4 rounded-xl font-semibold text-lg tracking-wide
                transition-all duration-300 transform
                ${
                  selectedAvatar !== undefined && !isSubmitting
                    ? "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-500/30 hover:shadow-xl hover:shadow-slate-600/40 hover:brightness-110 hover:scale-[1.02] active:scale-98"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed opacity-70"
                }
              `}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Setting...
                </span>
              ) : (
                "Set Profile Picture"
              )}
            </button>
          </>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}