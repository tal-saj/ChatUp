// SetAvatar.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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
      theme: "dark",
    }),
    []
  );

  // Protect route
  useEffect(() => {
    if (!localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)) {
      navigate("/login");
    }
  }, [navigate]);

  // Generate avatars
  useEffect(() => {
    const generateAvatars = async () => {
      try {
        const avatarData = [];

        for (let i = 0; i = 4; i++) {
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

      const { data } = await axios.post(`${setAvatarRoute}/${user._id}`, {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950/40 to-purple-950/30 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl flex flex-col items-center gap-10">
        {isLoading ? (
          <div className="flex flex-col items-center gap-6">
            <div className="h-16 w-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-gray-400 text-lg">Generating your avatars...</p>
          </div>
        ) : (
          <>
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-white text-center tracking-tight">
              Choose your profile picture
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
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-4 focus:ring-offset-gray-950
                    `}
                    aria-label={`Select avatar ${index + 1}`}
                  >
                    <div
                      className={`
                        relative rounded-full p-2 transition-all duration-300
                        ${
                          isSelected
                            ? "bg-gradient-to-br from-indigo-600/30 to-purple-600/30 ring-4 ring-indigo-500/70 ring-offset-4 ring-offset-gray-950 scale-110 shadow-2xl shadow-indigo-900/40"
                            : "bg-gray-900/40 ring-2 ring-gray-700/50 hover:ring-indigo-500/50 hover:scale-105 hover:shadow-xl hover:shadow-indigo-900/20"
                        }
                      `}
                    >
                      <img
                        src={`data:image/svg+xml;base64,${avatar}`}
                        alt={`Avatar option ${index + 1}`}
                        className="h-24 w-24 md:h-28 md:w-28 rounded-full object-cover transition-transform"
                      />
                    </div>

                    {isSelected && (
                      <span className="absolute -bottom-2 text-xs font-medium px-3 py-1 bg-indigo-600/90 text-white rounded-full shadow-md">
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
                min-w-[240px] px-8 py-4 rounded-xl font-semibold text-lg
                transition-all duration-300 transform
                ${
                  selectedAvatar !== undefined && !isSubmitting
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-700/30 hover:shadow-xl hover:shadow-indigo-700/40 hover:scale-105 active:scale-95"
                    : "bg-gray-700 text-gray-400 cursor-not-allowed opacity-70"
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

        <ToastContainer />
      </div>
    </div>
  );
}