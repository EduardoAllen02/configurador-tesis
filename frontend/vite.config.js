import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  // Worktrees may share dependencies, but never optimized module caches.
  cacheDir: `node_modules/.vite-${createHash("sha1").update(import.meta.url).digest("hex").slice(0, 10)}`,
  server: {
    port: 5173,
    fs: { allow: [fileURLToPath(new URL(".", import.meta.url)), realpathSync(fileURLToPath(new URL("./node_modules", import.meta.url)))] },
  },
  // Pruebas unitarias de la lógica pura del motor (sin DOM): corren en Node.
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
