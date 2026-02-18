import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { Buffer } from "buffer";
import loader from "../assets/loader.gif";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { setAvatarRoute } from "../utils/APIRoutes";
import multiavatar from "@multiavatar/multiavatar/esm";

export default function SetAvatar() {
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toastOptions = {
    position: "bottom-right",
    autoClose: 5000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };

  // Redirect if not logged in
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
          const randomString = Math.random().toString(36).substring(2);
          const svgString = multiavatar(randomString); // returns SVG string

          // Safer base64 encoding for SVG
          const base64 = Buffer.from(svgString).toString("base64");

          avatarData.push(base64);
        }

        setAvatars(avatarData);
      } catch (error) {
        console.error("Avatar generation failed:", error);
        toast.error("Failed to generate avatars", toastOptions);
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
        toast.error("User not found. Please log in again.", toastOptions);
        navigate("/login");
        return;
      }

      const { data } = await axios.post(`${setAvatarRoute}/${user._id}`, {
        image: avatars[selectedAvatar],
      });

      if (data.isSet) {
        // Update local user data
        const updatedUser = {
          ...user,
          isAvatarImageSet: true,
          avatarImage: data.image,
        };

        localStorage.setItem(
          process.env.REACT_APP_LOCALHOST_KEY,
          JSON.stringify(updatedUser)
        );

        toast.success("Avatar set successfully!", toastOptions);
        navigate("/");
      } else {
        toast.error("Failed to set avatar. Try again.", toastOptions);
      }
    } catch (error) {
      console.error("Set avatar error:", error);
      toast.error(
        error.response?.data?.message || "Error setting avatar",
        toastOptions
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      {isLoading ? (
        <div className="loader-container">
          <img src={loader} alt="Loading avatars..." className="loader" />
        </div>
      ) : (
        <>
          <div className="title-container">
            <h1>Pick an Avatar as your profile picture</h1>
          </div>

          <div className="avatars">
            {avatars.map((avatar, index) => (
              <div
                key={index} // index is fine here since avatars are generated once
                className={`avatar ${selectedAvatar === index ? "selected" : ""}`}
                onClick={() => setSelectedAvatar(index)}
                role="button"
                tabIndex={0}
                aria-label={`Select avatar ${index + 1}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedAvatar(index);
                  }
                }}
              >
                <img
                  src={`data:image/svg+xml;base64,${avatar}`}
                  alt={`Avatar option ${index + 1}`}
                />
              </div>
            ))}
          </div>

          <button
            onClick={setProfilePicture}
            className="submit-btn"
            disabled={selectedAvatar === undefined || isSubmitting}
          >
            {isSubmitting ? "Setting..." : "Set as Profile Picture"}
          </button>

          <ToastContainer />
        </>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 3rem;
  background-color: #131324;
  height: 100vh;
  width: 100vw;
  padding: 2rem;

  .loader-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  .loader {
    max-width: 100%;
    max-height: 50vh;
  }

  .title-container {
    h1 {
      color: white;
      text-align: center;
    }
  }

  .avatars {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2rem;

    .avatar {
      border: 0.4rem solid transparent;
      padding: 0.4rem;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.3s ease-in-out;
      cursor: pointer;

      img {
        height: 6rem;
        width: 6rem;
        object-fit: cover;
        border-radius: 50%;
        transition: all 0.3s ease-in-out;
      }

      &:hover {
        transform: scale(1.1);
      }
    }

    .selected {
      border: 0.4rem solid #4e0eff;
      transform: scale(1.1);
    }
  }

  .submit-btn {
    background-color: #4e0eff;
    color: white;
    padding: 1rem 2.5rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 0.5rem;
    font-size: 1.1rem;
    text-transform: uppercase;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      background-color: #3d0cd1;
      transform: translateY(-2px);
    }

    &:disabled {
      background-color: #666;
      cursor: not-allowed;
      opacity: 0.7;
    }
  }
`;