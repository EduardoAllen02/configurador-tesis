import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/useAuth.js";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ToursListPage from "./pages/ToursListPage.jsx";
import TourEditorPage from "./pages/TourEditorPage.jsx";
import TourViewerPage from "./pages/TourViewerPage.jsx";
import RedeemInvitationPage from "./pages/RedeemInvitationPage.jsx";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p>Cargando…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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
        path="/tours/:tourId/view"
        element={
          <RequireAuth>
            <TourViewerPage />
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
