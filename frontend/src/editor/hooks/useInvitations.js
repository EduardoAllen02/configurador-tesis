import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

// `enabled` evita el fetch para quien no puede gestionar invitaciones (Cliente) — el
// endpoint es admin-only desde Fase 2.0, así que llamarlo para ellos solo generaría un
// 403 innecesario en cada carga del editor.
export function useInvitations(tourId, enabled = true) {
  const [invitations, setInvitations] = useState([]);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      setInvitations(await api.get(`/api/tours/${tourId}/invitations`));
    } catch (err) {
      setError(err.message);
    }
  }, [tourId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createInvitation({ role, email }) {
    await api.post(`/api/tours/${tourId}/invitations`, { role, email: email || undefined });
    await reload();
  }

  async function removeInvitation(invitationId) {
    await api.delete(`/api/tours/${tourId}/invitations/${invitationId}`);
    await reload();
  }

  return { invitations, error, createInvitation, removeInvitation };
}
