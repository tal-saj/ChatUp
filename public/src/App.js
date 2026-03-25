// App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SetAvatar from "./components/SetAvatar";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FriendsPage from "./pages/FriendsPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
    <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/setAvatar" element={<SetAvatar />} />
  
  {/* Add a unique key to the fragment or the route to force a clean swap */}
  <Route 
    path="/" 
    element={
      <ProtectedRoute key="chat-route">
        <Chat />
      </ProtectedRoute>
    } 
  />
  <Route 
    path="/friends" 
    element={
      <ProtectedRoute key="friends-route">
        <FriendsPage />
      </ProtectedRoute>
    } 
  />
  
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
    </BrowserRouter>
  );
}