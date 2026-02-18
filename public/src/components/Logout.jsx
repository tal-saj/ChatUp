import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BiPowerOff } from "react-icons/bi";
import styled from "styled-components";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";

export default function Logout() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // prevent double-click spam

    setIsLoggingOut(true);

    try {
      // Safely get user ID from localStorage
      const userData = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY) || "{}"
      );

      if (!userData?._id) {
        console.warn("No user ID found in localStorage");
        localStorage.clear();
        navigate("/login");
        return;
      }

      // Most logout endpoints expect POST (to invalidate token/session)
      // If your backend really uses GET with /:id, change back to .get()
      const response = await axios.post(logoutRoute, {
        userId: userData._id, // or just send nothing if backend uses auth token
      });

      // Check status or success field based on your backend response
      if (response.status === 200 || response.data?.success) {
        localStorage.clear();
        navigate("/login");
      } else {
        console.error("Logout failed:", response.data);
        // Optional: show toast "Logout failed, try again"
      }
    } catch (error) {
      console.error("Logout error:", error.message || error);
      // Optional: toast error message
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoggingOut}
      title="Log out"
      aria-label="Log out"
    >
      <BiPowerOff />
    </Button>
  );
}

const Button = styled.button`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background-color: #9a86f3;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #7f6cd1;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    font-size: 1.3rem;
    color: #ebe7ff;
  }
`;