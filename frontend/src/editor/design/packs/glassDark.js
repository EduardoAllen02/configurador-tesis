import { element, frame, tourBars } from "./helpers.js";

// "Cristal oscuro": el estilo del tour de Colombini. Tarjetas de cristal sobre un fondo azul
// noche con cuadrícula, etiqueta en mayúsculas, cifras y un botón blanco "Entrar".
export const glassDark = {
  id: "glass-dark",
  name: "Cristal oscuro",
  description: "Tarjetas de cristal sobre fondo azul noche, cifras y botón blanco.",
  preview: { bg: "linear-gradient(160deg,#0e1728 0%,#17284a 60%,#0b1424 100%)", fg: "#f6f8fb", accent: "#4c8dff", card: "rgba(20,37,68,.55)", dark: true },
  design: {
    brand: { colors: ["#ffffff", "#4c8dff", "#0e1728", "#f6f8fb", "#c98a12"], radius: 5, fonts: { heading: "Inter", body: "Inter" } },
    screens: {
      intro: {
        enabled: true,
        background: {
          kind: "color",
          color: "linear-gradient(160deg, #0e1728 0%, #17284a 55%, #0b1424 100%)",
          scrim: { from: "rgba(8,14,26,.7)", to: "rgba(8,14,26,.15)", angle: 90, mobileAngle: 180, opacity: 1 },
          grid: { on: true, size: 68, opacity: 0.055 },
          parallax: true,
        },
        elements: [
          element("g-kicker", "text", { variant: "kicker", text: "Recorrido virtual 360°" }, frame("top-left", 72, 190, 420), 1),
          element("g-title", "text", { variant: "title", text: "Explora el espacio\nde principio a fin" }, frame("top-left", 72, 222, 640), 2),
          element("g-lead", "text", { variant: "paragraph", text: "Recorre cada ambiente a tu ritmo. Arrastra para mirar alrededor y toca los puntos para ver más." }, frame("top-left", 72, 380, 500), 3),
          element("g-enter", "button", { label: "Entrar al tour", variant: "primary", icon: "arrow-right", action: { type: "enter", target: null } }, frame("top-left", 72, 490, 260), 4),
          element("g-stats", "stats-row", {}, frame("bottom-left", 72, -64), 5),
          element(
            "g-card",
            "glass-card",
            {
              kicker: "Lo que vas a ver",
              title: "",
              children: [
                { template: "feature-list", props: { heading: "" } },
                { template: "stats-counter", props: { heading: "En números" } },
              ],
            },
            frame("right", -72, 0, 400),
            6,
            { mode: "hidden" }
          ),
          element("g-loader", "loader", {}, frame("bottom-right", -72, -64, 220), 7),
        ],
      },
      tour: { elements: tourBars() },
    },
    hotspotPresets: {
      info: { template: "ring-sweep", props: {} },
      price: { template: "price-tag", props: {} },
      nav: { template: "nav-arrow", props: {} },
    },
    detailPanel: { template: "side-sheet", props: { tone: "dark" } },
  },
};
