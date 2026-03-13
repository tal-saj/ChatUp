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
    <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <Login />} />
    <Route path="/register" element={isLoggedIn ? <Navigate to="/" replace /> : <Register />} />
    <Route path="/setAvatar" element={<SetAvatar />} />
    <Route path="/" element={<Chat />} />
    <Route path="/friends" element={<FriendsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</BrowserRouter>
  );
}