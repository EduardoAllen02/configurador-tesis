import { defineConfig } from "vite";
import { resolve } from "node:path";

// Compila el motor del tour (src/runtime) como un único IIFE autocontenido para el export:
// three y CSS2DRenderer van dentro (sin CDN ni import map) y se expone window.TourRuntime.
// El backend copia dist-runtime/ COMPLETO al bundle exportado (docs/CONTRATO_OLEADA2.md §0).
//
// Salida: tour-runtime.iife.js + tour-runtime.css + assets/*.woff2 (fuentes curadas).
// No usa `build.lib` porque en modo librería Vite incrusta TODOS los assets y no deja sacar las
// fuentes como archivos; con un build normal de un solo punto de entrada se controla qué se
// incrusta (Inter, la fuente por defecto) y qué sale suelto (Manrope, DM Sans, Playfair, JetBrains
// Mono: el navegador solo descarga la que el diseño usa).
export default defineConfig({
  // Rutas relativas: el CSS del export vive en runtime/ y busca sus fuentes en runtime/assets/.
  base: "./",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: "dist-runtime",
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: (filePath) => /[\/]inter[\/]/.test(filePath),
    rollupOptions: {
      input: resolve(import.meta.dirname, "src/runtime/index.js"),
      preserveEntrySignatures: "exports-only",
      output: {
        format: "iife",
        name: "TourRuntime",
        inlineDynamicImports: true,
        entryFileNames: "tour-runtime.iife.js",
        assetFileNames: (asset) =>
          asset.names?.some((n) => n.endsWith(".css")) ? "tour-runtime.css" : "assets/[name]-[hash][extname]",
      },
    },
  },
});
