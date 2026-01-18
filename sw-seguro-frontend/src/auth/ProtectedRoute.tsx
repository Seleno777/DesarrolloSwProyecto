import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <div style={{ padding: 16 }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
