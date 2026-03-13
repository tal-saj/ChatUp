import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SetAvatar from "./components/SetAvatar";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FriendsPage from "./pages/FriendsPage";

export default function App() {
  const isLoggedIn = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/" replace /> : <Register />}
        />

        {/* Protected-like routes */}
        <Route path="/setAvatar" element={<SetAvatar />} />
        <Route path="/" element={<Chat />} />          {/* Chat page (can render Contacts inside it) */}
        <Route path="/friends" element={<FriendsPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}