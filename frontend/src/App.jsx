import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/useAuth.js";
import { peekLoggingOut, resetLoggingOutFlag } from "./auth/logoutIntent.js";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import ToursListPage from "./pages/ToursListPage.jsx";
import TourEditorPage from "./pages/TourEditorPage.jsx";
import TourViewerPage from "./pages/TourViewerPage.jsx";
import TourDesignPage from "./pages/TourDesignPage.jsx";
import TourPublishPage from "./pages/TourPublishPage.jsx";
import RedeemInvitationPage from "./pages/RedeemInvitationPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Lectura pura — el reset vive en el efecto de abajo, nunca aquí (ver logoutIntent.js).
  const wasLoggingOut = peekLoggingOut();

  useEffect(() => {
    if (wasLoggingOut) resetLoggingOutFlag();
  }, [wasLoggingOut]);

  if (loading) return <p>Cargando…</p>;
  if (!user) {
    // Un logout explícito no debe "recordar" dónde estabas — solo el caso de llegar
    // aquí sin sesión (ej. abrir un link de invitación) guarda el origen para volver.
    return <Navigate to="/login" replace state={wasLoggingOut ? undefined : { from: location }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/tours"
        element={
          <RequireAuth>
            <ToursListPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tours/:tourId/edit"
        element={
          <RequireAuth>
            <TourEditorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tours/:tourId/design"
        element={
          <RequireAuth>
            <TourDesignPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tours/:tourId/publish"
        element={
          <RequireAuth>
            <TourPublishPage />
          </RequireAuth>
        }
      />
      <Route
        path="/tours/:tourId/view"
        element={
          <RequireAuth>
            <TourViewerPage />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAuth>
            <UsersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/invitations/:token"
        element={
          <RequireAuth>
            <RedeemInvitationPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/tours" replace />} />
    </Routes>
  );
}
