import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function useInvitations(tourId) {
  const [invitations, setInvitations] = useState([]);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setInvitations(await api.get(`/api/tours/${tourId}/invitations`));
    } catch (err) {
      setError(err.message);
    }
  }, [tourId]);

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
