import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

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

  if (status === "pending") return <p style={{ margin: "2rem" }}>Canjeando invitación…</p>;
  return (
    <div style={{ margin: "2rem" }}>
      <p style={{ color: "salmon" }}>{error}</p>
      <Link to="/tours">← Volver a mis tours</Link>
    </div>
  );
}
