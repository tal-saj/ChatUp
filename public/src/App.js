import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SetAvatar from "./components/SetAvatar";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - redirect to chat if already logged in */}
        <Route
          path="/login"
          element={
            localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY) ? (
              <Navigate to="/" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/register"
          element={
            localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY) ? (
              <Navigate to="/" replace />
            ) : (
              <Register />
            )
          }
        />

        {/* Protected-like routes */}
        <Route path="/setAvatar" element={<SetAvatar />} />
        <Route path="/" element={<Chat />} />

        {/* Optional: catch-all redirect to login or chat */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}