import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import LoginPage from "./pages/Login";
import DocumentsList from "./pages/DocumentsList";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import ShareLinkAccess from "./pages/ShareLinkAccess";
import DocumentViewer from "./pages/DocumentViewer";
import PublicDocument from "./pages/PublicDocument"; // ✅ NUEVO
import "./styles/Auth.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Share link access (public) */}
          <Route path="/share/:token" element={<ShareLinkAccess />} />

          {/* ✅ Public document (NO login) */}
          <Route path="/public/:token" element={<PublicDocument />} />
          

          {/* Viewer */}
          <Route path="/documents/view/:docId" element={<DocumentViewer />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DocumentsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentsList />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
