import React, { useState } from "react";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import styled from "styled-components";
import Picker from "emoji-picker-react";
import { EmojiStyle } from "emoji-picker-react"; // Import for v4+ to avoid warnings

export default function ChatInput({ handleSendMsg }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiPickerToggle = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const handleEmojiClick = (emojiData) => {
    // emojiData is the first param in v4+
    const emoji = emojiData.emoji;
    setMsg((prev) => prev + emoji);
  };

  const sendChat = (event) => {
    event.preventDefault();
    const trimmedMsg = msg.trim();
    if (trimmedMsg.length > 0) {
      handleSendMsg(trimmedMsg);
      setMsg("");
      setShowEmojiPicker(false); // Optional: close picker after send
    }
  };

  return (
    <Container>
      <div className="button-container">
        <div className="emoji">
          <BsEmojiSmileFill
            onClick={handleEmojiPickerToggle}
            aria-label="Toggle emoji picker"
          />
          {showEmojiPicker && (
            <Picker
              onEmojiClick={handleEmojiClick}
              emojiStyle={EmojiStyle.NATIVE} // or GOOGLE / TWITTER — prevents console errors
              // Optional props for better UX:
              // height={350}
              // width="100%"
              // previewConfig={{ showPreview: false }}
              // skinTonesDisabled
            />
          )}
        </div>
      </div>

      <form className="input-container" onSubmit={sendChat}>
        <input
          type="text"
          placeholder="Type your message here..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          aria-label="Message input"
        />
        <button type="submit" aria-label="Send message">
          <IoMdSend />
        </button>
      </form>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: 5% 95%;
  background-color: #080420;
  padding: 0 2rem;

  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0 1rem;
    gap: 1rem;
  }

  .button-container {
    display: flex;
    align-items: center;
    color: white;
    gap: 1rem;

    .emoji {
      position: relative;

      svg {
        font-size: 1.5rem;
        color: #ffff00c8;
        cursor: pointer;
      }

      .emoji-picker-react {
        position: absolute;
        top: -350px;
        left: 0;
        background-color: #080420;
        box-shadow: 0 5px 10px #9a86f3;
        border-color: #9a86f3;
        z-index: 10;

        .emoji-scroll-wrapper::-webkit-scrollbar {
          background-color: #080420;
          width: 5px;
        }

        .emoji-scroll-wrapper::-webkit-scrollbar-thumb {
          background-color: #9a86f3;
        }

        .emoji-categories {
          button {
            filter: contrast(0);
          }
        }

        .emoji-search {
          background-color: transparent;
          border-color: #9a86f3;
        }

        .emoji-group:before {
          background-color: #080420;
        }
      }
    }
  }

  .input-container {
    width: 100%;
    border-radius: 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    background-color: #ffffff34;

    input {
      width: 90%;
      height: 60%;
      background-color: transparent;
      color: white;
      border: none;
      padding-left: 1rem;
      font-size: 1.2rem;

      &::selection {
        background-color: #9a86f3;
      }

      &:focus {
        outline: none;
      }
    }

    button {
      padding: 0.3rem 2rem;
      border-radius: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #9a86f3;
      border: none;
      cursor: pointer;

      @media screen and (min-width: 720px) and (max-width: 1080px) {
        padding: 0.3rem 1rem;

        svg {
          font-size: 1rem;
        }
      }

      svg {
        font-size: 2rem;
        color: white;
      }
    }
  }
`;