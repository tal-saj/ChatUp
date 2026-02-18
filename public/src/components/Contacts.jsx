import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";

export default function Contacts({ contacts, changeChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = JSON.parse(
          localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
        );

        if (data?.username && data?.avatarImage) {
          setCurrentUserName(data.username);
          setCurrentUserImage(data.avatarImage);
        }
      } catch (error) {
        console.error("Failed to load current user from localStorage:", error);
      }
    };

    fetchUserData();
  }, []); // Empty dependency array → runs once on mount

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  // Show nothing or a loading state until current user is loaded
  if (!currentUserName || !currentUserImage) {
    return null; // or <div className="loading">Loading contacts...</div>
  }

  return (
    <Container>
      <div className="brand">
        <img src={Logo} alt="ChatUp logo" />
        <h3>ChatUp</h3>
      </div>

      <div className="contacts">
        {contacts.map((contact, index) => (
          <div
            key={contact._id}
            className={`contact ${index === currentSelected ? "selected" : ""}`}
            onClick={() => changeCurrentChat(index, contact)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                changeCurrentChat(index, contact);
              }
            }}
          >
            <div className="avatar">
              <img
                src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                alt={`${contact.username}'s avatar`}
              />
            </div>
            <div className="username">
              <h3>{contact.username}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="current-user">
        <div className="avatar">
          <img
            src={`data:image/svg+xml;base64,${currentUserImage}`}
            alt="Your avatar"
          />
        </div>
        <div className="username">
          <h2>{currentUserName}</h2>
        </div>
      </div>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 75% 15%;
  overflow: hidden;
  background-color: #080420;

  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    padding: 1rem 0;

    img {
      height: 2rem;
    }

    h3 {
      color: white;
      text-transform: uppercase;
    }
  }

  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
    gap: 0.8rem;
    padding: 1rem 0;

    &::-webkit-scrollbar {
      width: 0.2rem;
    }

    &::-webkit-scrollbar-thumb {
      background-color: #ffffff39;
      width: 0.1rem;
      border-radius: 1rem;
    }

    .contact {
      background-color: #ffffff34;
      min-height: 5rem;
      cursor: pointer;
      width: 90%;
      border-radius: 0.5rem;
      padding: 0.6rem 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: all 0.3s ease-in-out;

      &:hover {
        background-color: #ffffff4d;
      }

      .avatar {
        img {
          height: 3rem;
          border-radius: 50%;
        }
      }

      .username {
        h3 {
          color: white;
          margin: 0;
        }
      }
    }

    .selected {
      background-color: #9a86f3 !important;
    }
  }

  .current-user {
    background-color: #0d0d30;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem;

    .avatar {
      img {
        height: 4rem;
        max-inline-size: 100%;
        border-radius: 50%;
      }
    }

    .username {
      h2 {
        color: white;
        margin: 0;
        font-size: 1.3rem;
      }
    }

    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.8rem;
      padding: 0.8rem;

      .username h2 {
        font-size: 1.1rem;
      }
    }
  }
`;