import { element, frame, tourBars } from "./helpers.js";

// "Minimal claro": fondo marfil, texto centrado y un solo botón oscuro. Mucho aire.
export const minimalLight = {
  id: "minimal-light",
  name: "Minimal claro",
  description: "Fondo claro, texto centrado y un botón oscuro. Limpio y con mucho aire.",
  preview: { bg: "#f4f2ed", fg: "#1a1a18", accent: "#2f6fed", card: "#ffffff", dark: false },
  design: {
    brand: { colors: ["#1a1a18", "#2f6fed", "#f4f2ed", "#6b6a66", "#ffffff"], radius: 8, fonts: { heading: "DM Sans", body: "DM Sans" } },
    screens: {
      intro: {
        enabled: true,
        background: {
          kind: "color",
          color: "#f4f2ed",
          scrim: { from: "rgba(244,242,237,0)", to: "rgba(244,242,237,0)", angle: 90, mobileAngle: 180, opacity: 0 },
          grid: { on: false, size: 68, opacity: 0.05 },
          parallax: false,
        },
        elements: [
          element("m-kicker", "text", { variant: "kicker", text: "Recorrido virtual", color: "#6b6a66", align: "center" }, frame("top", 0, 190, 400), 1),
          element("m-title", "text", { variant: "title", text: "Bienvenido", color: "#1a1a18", size: 72, weight: 600, align: "center" }, frame("top", 0, 226, 800), 2),
          element("m-lead", "text", { variant: "paragraph", text: "Camina por el espacio como si estuvieras ahí. Arrastra para mirar alrededor.", color: "#55534e", align: "center" }, frame("top", 0, 340, 560), 3),
          element("m-enter", "button", { label: "Entrar", variant: "primary", icon: "arrow-right", fill: "#1a1a18", color: "#ffffff", radius: 8, action: { type: "enter", target: null } }, frame("top", 0, 450, 240), 4),
          element("m-stats", "stats-row", { valueColor: "#1a1a18", labelColor: "#6b6a66" }, frame("bottom", 0, -72), 5),
        ],
      },
      tour: { elements: tourBars() },
    },
    hotspotPresets: {
      info: { template: "pulse-dot", props: {} },
      price: { template: "price-tag", props: { fill: "#1a1a18" } },
      nav: { template: "nav-arrow", props: {} },
    },
    detailPanel: { template: "floating-card", props: { tone: "light" } },
  },
};
