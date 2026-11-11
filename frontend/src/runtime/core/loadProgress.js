// Descarga real. Content-Length ausente o comprimido mantiene total=0 hasta completar.
export async function fetchBlobWithProgress(url, { onProgress, signal, fetcher = fetch } = {}) {
  const response = await fetcher(url, { signal });
  if (!response.ok) throw new Error(`No se pudo descargar la imagen (${response.status})`);
  const header = Number(response.headers.get("content-length"));
  const total = !response.headers.get("content-encoding") && header > 0 ? header : 0;
  onProgress?.({ loaded: 0, total });
  if (!response.body?.getReader) {
    const blob = await response.blob();
    onProgress?.({ loaded: blob.size, total: blob.size });
    return blob;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.({ loaded, total });
    }
  } finally {
    reader.releaseLock();
  }
  const blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
  onProgress?.({ loaded, total: loaded });
  return blob;
}
