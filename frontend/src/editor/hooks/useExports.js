import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";

export function useExports(tourId) {
  const [exports, setExports] = useState([]);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const reload = useCallback(async () => {
    try {
      setExports(await api.get(`/api/tours/${tourId}/exports`));
    } catch (err) {
      setError(err.message);
    }
  }, [tourId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createExport() {
    setExporting(true);
    try {
      await api.post(`/api/tours/${tourId}/exports`);
      await reload();
    } finally {
      setExporting(false);
    }
  }

  return { exports, error, exporting, createExport };
}
