import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Robot from "../assets/robot.gif";

export default function Welcome() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadUserName = () => {
      try {
        const userData = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
        
        if (userData) {
          const parsed = JSON.parse(userData);
          if (parsed?.username) {
            setUserName(parsed.username);
          }
        }
      } catch (error) {
        console.error("Failed to load username from localStorage:", error);
        // Optional: redirect to login or show message
      }
    };

    loadUserName();
  }, []); // Empty array → runs once on mount

  return (
    <Container>
      <img src={Robot} alt="Welcome robot animation" />
      
      <h1>
        Welcome, <span>{userName || "Friend"}!</span>
      </h1>
      
      <h3>Please select a chat to start messaging.</h3>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  color: white;
  height: 100%;
  width: 100%;
  text-align: center;
  padding: 2rem;
  gap: 1.5rem;

  img {
    height: 20rem;
    max-width: 90%;
    object-fit: contain;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0;

    @media screen and (max-width: 768px) {
      font-size: 2rem;
    }
  }

  h3 {
    font-size: 1.3rem;
    opacity: 0.9;
    margin: 0;

    @media screen and (max-width: 768px) {
      font-size: 1.1rem;
    }
  }

  span {
    color: #4e0eff;
    font-weight: bold;
  }
`;