// components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const user = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}