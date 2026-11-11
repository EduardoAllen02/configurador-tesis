import { element, frame, tourBars } from "./helpers.js";

// "Audaz": negro y amarillo, titular enorme y esquinas rectas. Para llamar la atención.
export const bold = {
  id: "bold",
  name: "Audaz",
  description: "Negro y amarillo, titular enorme y esquinas rectas.",
  preview: { bg: "#0b0b0b", fg: "#ffffff", accent: "#ffd400", card: "#ffd400", dark: true },
  design: {
    brand: { colors: ["#ffd400", "#111111", "#ffffff", "#ff3b30", "#2f6fed"], radius: 0, fonts: { heading: "Manrope", body: "Manrope" } },
    screens: {
      intro: {
        enabled: true,
        background: {
          kind: "color",
          color: "#0b0b0b",
          scrim: { from: "rgba(11,11,11,0)", to: "rgba(11,11,11,0)", angle: 90, mobileAngle: 180, opacity: 0 },
          grid: { on: true, size: 120, opacity: 0.07 },
          parallax: true,
        },
        elements: [
          element("b-disc", "shape", { shape: "circle", fill: "#ffd400", radius: 0 }, frame("right", -140, -20, 260, 260), 1),
          element("b-bar", "shape", { shape: "rect", fill: "#ffd400", radius: 0 }, frame("top-left", 72, 150, 96, 10), 2),
          element("b-kicker", "text", { variant: "kicker", text: "Tour 360° · Entra ya", color: "#ffd400" }, frame("top-left", 72, 176, 420), 3),
          element("b-title", "text", { variant: "title", text: "Vive\nel lugar.", color: "#ffffff", size: 120, weight: 800 }, frame("top-left", 72, 212, 800), 4),
          element("b-lead", "text", { variant: "paragraph", text: "Un recorrido sin filtros. Mira cada rincón y toca los puntos amarillos.", color: "#d4d4d4" }, frame("top-left", 72, 500, 460), 5),
          element("b-enter", "button", { label: "Entrar ahora", variant: "primary", icon: "arrow-right", fill: "#ffd400", color: "#111111", radius: 0, action: { type: "enter", target: null } }, frame("top-left", 72, 600, 280), 6),
          element("b-stats", "stats-row", { valueColor: "#ffd400", labelColor: "#d4d4d4" }, frame("bottom-right", -72, -64), 7),
        ],
      },
      tour: { elements: tourBars() },
    },
    hotspotPresets: {
      info: { template: "corner-brackets", props: { stroke: "#ffd400", fill: "#ffd400" } },
      price: { template: "price-tag", props: { fill: "#ffd400", iconColor: "#111111" } },
      nav: { template: "square-border", props: { stroke: "#ffd400" } },
    },
    detailPanel: { template: "bottom-sheet", props: { tone: "dark" } },
  },
};
