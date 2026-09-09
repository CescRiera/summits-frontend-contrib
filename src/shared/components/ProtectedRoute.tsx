import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLoadingScreen from "./AuthLoadingScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, authReady } = useAuth();

  // Wait for auth to be ready before making decisions
  if (!authReady) {
    return <AuthLoadingScreen>{null}</AuthLoadingScreen>;
  }

  // Redirect to home if user is not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated, render the protected component
  return <>{children}</>;
};

export default ProtectedRoute;






































