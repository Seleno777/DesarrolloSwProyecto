import React from "react";
import { useAuth } from "../auth/AuthProvider";

export default function HomePage() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ padding: 16 }}>
      <h1>Home</h1>
      <p>Logueado como: <b>{user?.email}</b></p>

      <button onClick={() => signOut()} style={{ padding: 10 }}>
        Cerrar sesión
      </button>
    </div>
  );
}
