import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { LogoMark } from "../components/ui/Icon.jsx";

// Ruta protegida (requiere sesión iniciada): canjea el token de invitación y redirige
// al visor del tour. El propio token es la autorización — no requiere admin_tour previo.
export default function RedeemInvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .post(`/api/invitations/${token}/redeem`)
      .then(({ tourId }) => {
        if (cancelled) return;
        setStatus("done");
        navigate(`/tours/${tourId}/view`, { replace: true });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
      <div className="card card-pad stack" style={{ width: 380, alignItems: "center", textAlign: "center" }}>
        <LogoMark width={28} height={28} strokeWidth={1.5} />
        {status === "pending" && <p className="text-soft">Canjeando invitación…</p>}
        {status === "error" && (
          <>
            <p className="error-text">{error}</p>
            <Link to="/tours" className="btn btn-secondary">Volver a mis tours</Link>
          </>
        )}
      </div>
    </div>
  );
}
