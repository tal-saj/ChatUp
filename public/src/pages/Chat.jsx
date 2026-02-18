import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load current user from localStorage + redirect if not logged in
  useEffect(() => {
    const userData = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);

    if (!userData) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser?._id) {
        setCurrentUser(parsedUser);
      } else {
        localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
        navigate("/login");
      }
    } catch (error) {
      console.error("Invalid user data in localStorage:", error);
      localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
      navigate("/login");
    }
  }, [navigate]);

  // 2. Initialize socket when currentUser is ready
  useEffect(() => {
    if (!currentUser?._id) return;

    socket.current = io(host, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.current.emit("add-user", currentUser._id);

    // Cleanup on unmount / user change
    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [currentUser]);

  // 3. Fetch contacts when currentUser changes
  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentUser) return;

      setIsLoading(true);

      try {
        if (!currentUser.isAvatarImageSet) {
          navigate("/setAvatar");
          return;
        }

        const { data } = await axios.get(`${allUsersRoute}/${currentUser._id}`);

        setContacts(data || []);
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
        // Optional: toast.error("Could not load users")
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [currentUser, navigate]);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  if (isLoading || !currentUser) {
    return (
      <Container>
        <div className="loading">Loading...</div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="container">
        <Contacts contacts={contacts} changeChat={handleChatChange} />

        {currentChat === undefined ? (
          <Welcome />
        ) : (
          <ChatContainer currentChat={currentChat} socket={socket} />
        )}
      </div>
    </Container>
  );
}

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: #131324;

  .container {
    height: 85vh;
    width: 85vw;
    background-color: #00000076;
    display: grid;
    grid-template-columns: 25% 75%;
    overflow: hidden;
    border-radius: 1rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
    }

    @media screen and (max-width: 720px) {
      grid-template-columns: 1fr;
      height: 100vh;
      width: 100vw;
      border-radius: 0;
    }
  }

  .loading {
    color: white;
    font-size: 1.5rem;
    text-align: center;
    padding: 2rem;
  }
`;