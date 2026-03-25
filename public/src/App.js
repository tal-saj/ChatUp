import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import SetAvatar from "./components/SetAvatar";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FriendsPage from "./pages/FriendsPage";
import ProtectedRoute from "./components/ProtectedRoute";

// We create a wrapper component because useLocation must be inside a <BrowserRouter>
function AnimatedRoutes() {
  const location = useLocation();

  return (
    /* The key={location.pathname} is the "Magic Fix" */
    /* It forces React to destroy the old component and mount the new one */
    <Routes location={location} key={location.pathname}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/setAvatar" element={<SetAvatar />} />
      
      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/friends" 
        element={
          <ProtectedRoute>
            <FriendsPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Fallback Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}