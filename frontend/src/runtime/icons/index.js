/*
 * Set de iconos del motor: trazos de 24×24 al estilo Lucide (https://lucide.dev), en línea para
 * que el tour funcione sin internet.
 *
 * Lucide — ISC License
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
 * All other copyright (c) for Lucide are held by Lucide Contributors 2022.
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or
 * without fee is hereby granted, provided that the above copyright notice and this permission
 * notice appear in all copies.
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
 * SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS.
 *
 * Cada icono es una lista de `d` de <path>. Se arman con createElementNS (nunca innerHTML).
 */
const SVG_NS = "http://www.w3.org/2000/svg";

// Atajos para formas básicas, convertidas a path.
const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rect = (x, y, w, h, r = 0) =>
  r
    ? `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
    : `M${x} ${y}h${w}v${h}h${-w}z`;
const dot = (x, y) => `M${x} ${y}h.01`;

export const ICONS = {
  info: { cat: "information", name: "Información", d: [circle(12, 12, 10), "M12 16v-4", dot(12, 8)] },
  "circle-help": { cat: "information", name: "Ayuda", d: [circle(12, 12, 10), "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", dot(12, 17)] },
  "circle-alert": { cat: "information", name: "Aviso", d: [circle(12, 12, 10), "M12 8v4", dot(12, 16)] },
  check: { cat: "general", name: "Check", d: ["M20 6 9 17l-5-5"] },
  "circle-check": { cat: "information", name: "Confirmado", d: [circle(12, 12, 10), "m9 12 2 2 4-4"] },
  x: { cat: "general", name: "Cerrar", d: ["M18 6 6 18", "m6 6 12 12"] },
  plus: { cat: "general", name: "Más", d: ["M5 12h14", "M12 5v14"] },
  minus: { cat: "general", name: "Menos", d: ["M5 12h14"] },
  "arrow-right": { cat: "arrows", name: "Flecha derecha", d: ["M5 12h14", "m12 5 7 7-7 7"] },
  "arrow-left": { cat: "arrows", name: "Flecha izquierda", d: ["M19 12H5", "m12 19-7-7 7-7"] },
  "arrow-up": { cat: "arrows", name: "Flecha arriba", d: ["m5 12 7-7 7 7", "M12 19V5"] },
  "arrow-down": { cat: "arrows", name: "Flecha abajo", d: ["M12 5v14", "m19 12-7 7-7-7"] },
  "arrow-up-right": { cat: "arrows", name: "Flecha diagonal", d: ["M7 7h10v10", "M7 17 17 7"] },
  "chevron-right": { cat: "arrows", name: "Chevron derecha", d: ["m9 18 6-6-6-6"] },
  "chevron-left": { cat: "arrows", name: "Chevron izquierda", d: ["m15 18-6-6 6-6"] },
  "chevron-up": { cat: "arrows", name: "Chevron arriba", d: ["m18 15-6-6-6 6"] },
  "chevron-down": { cat: "arrows", name: "Chevron abajo", d: ["m6 9 6 6 6-6"] },
  "chevrons-right": { cat: "arrows", name: "Avanzar", d: ["m6 17 5-5-5-5", "m13 17 5-5-5-5"] },
  navigation: { cat: "places", name: "Navegación", d: ["M3 11 22 2l-9 19-2-8z"] },
  "map-pin": { cat: "places",
    name: "Ubicación",
    d: [
      "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
      circle(12, 10, 3),
    ],
  },
  map: { cat: "places",
    name: "Mapa",
    d: [
      "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z",
      "M15 5.764v15",
      "M9 3.236v15",
    ],
  },
  compass: { cat: "places",
    name: "Brújula",
    d: [
      circle(12, 12, 10),
      "m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z",
    ],
  },
  "view-360": { cat: "places",
    name: "Vista 360",
    d: [
      "M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2",
      "m15.194 13.707 3.814 1.86-1.86 3.814",
      "M19 15.57c-1.804.885-4.274 1.43-7 1.43-5.523 0-10-2.239-10-5s4.477-5 10-5c4.838 0 8.873 1.718 9.8 4",
    ],
  },
  house: { cat: "home",
    name: "Casa",
    d: [
      "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",
      "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    ],
  },
  building: { cat: "home",
    name: "Edificio",
    d: [rect(4, 2, 16, 20, 2), "M9 22v-4h6v4", dot(8, 6), dot(16, 6), dot(12, 6), dot(12, 10), dot(12, 14), dot(16, 10), dot(16, 14), dot(8, 10), dot(8, 14)],
  },
  "door-open": { cat: "home",
    name: "Puerta",
    d: [
      "M13 4h3a2 2 0 0 1 2 2v14",
      "M2 20h3",
      "M13 20h9",
      "M10 12v.01",
      "M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z",
    ],
  },
  bed: { cat: "home", name: "Cama", d: ["M2 4v16", "M2 8h18a2 2 0 0 1 2 2v10", "M2 17h20", "M6 8v9"] },
  bath: { cat: "home",
    name: "Baño",
    d: [
      "M10 4 8 6",
      "M17 19v2",
      "M2 12h20",
      "M7 19v2",
      "M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5",
    ],
  },
  sofa: { cat: "home",
    name: "Sala",
    d: [
      "M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3",
      "M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z",
      "M4 18v2",
      "M20 18v2",
    ],
  },
  utensils: { cat: "home",
    name: "Cocina",
    d: ["M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2", "M7 2v20", "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"],
  },
  tv: { cat: "home", name: "Televisión", d: [rect(2, 7, 20, 15, 2), "m17 2-5 5-5-5"] },
  car: { cat: "places",
    name: "Auto",
    d: [
      "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2",
      circle(7, 17, 2),
      "M9 17h6",
      circle(17, 17, 2),
    ],
  },
  trees: { cat: "places",
    name: "Jardín",
    d: [
      "M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z",
      "M7 16v6",
      "M13 19v3",
      "M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5",
    ],
  },
  waves: { cat: "home",
    name: "Alberca",
    d: [
      "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      "M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
    ],
  },
  mountain: { cat: "places", name: "Montaña", d: ["m8 3 4 8 5-5 5 15H2L8 3z"] },
  sun: { cat: "general",
    name: "Sol",
    d: [circle(12, 12, 4), "M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"],
  },
  moon: { cat: "general", name: "Luna", d: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"] },
  star: { cat: "general", name: "Estrella", d: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"] },
  heart: { cat: "general",
    name: "Corazón",
    d: ["M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"],
  },
  sparkles: { cat: "general",
    name: "Destacado",
    d: [
      "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
      "M20 3v4",
      "M22 5h-4",
      "M4 17v2",
      "M5 18H3",
    ],
  },
  camera: { cat: "media",
    name: "Cámara",
    d: ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z", circle(12, 13, 3)],
  },
  image: { cat: "media", name: "Imagen", d: [rect(3, 3, 18, 18, 2), circle(9, 9, 2), "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"] },
  video: { cat: "media",
    name: "Video",
    d: ["m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5", rect(2, 6, 14, 12, 2)],
  },
  play: { cat: "media",
    name: "Reproducir",
    d: ["M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"],
  },
  eye: { cat: "media",
    name: "Ver",
    d: ["M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0", circle(12, 12, 3)],
  },
  search: { cat: "general", name: "Buscar", d: ["m21 21-4.34-4.34", circle(11, 11, 8)] },
  "zoom-in": { cat: "general", name: "Acercar", d: [circle(11, 11, 8), "m21 21-4.3-4.3", "M11 8v6", "M8 11h6"] },
  maximize: { cat: "general",
    name: "Pantalla completa",
    d: ["M8 3H5a2 2 0 0 0-2 2v3", "M21 8V5a2 2 0 0 0-2-2h-3", "M3 16v3a2 2 0 0 0 2 2h3", "M16 21h3a2 2 0 0 0 2-2v-3"],
  },
  move: { cat: "arrows", name: "Mover", d: ["M12 2v20", "m15 19-3 3-3-3", "m19 9 3 3-3 3", "M2 12h20", "m5 9-3 3 3 3", "m9 5 3-3 3 3"] },
  layers: { cat: "general",
    name: "Capas",
    d: [
      "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
      "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
      "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
    ],
  },
  "layout-grid": { cat: "general", name: "Cuadrícula", d: [rect(3, 3, 7, 7, 1), rect(14, 3, 7, 7, 1), rect(14, 14, 7, 7, 1), rect(3, 14, 7, 7, 1)] },
  list: { cat: "general", name: "Lista", d: ["M3 12h.01", "M3 18h.01", "M3 6h.01", "M8 12h13", "M8 18h13", "M8 6h13"] },
  "file-text": { cat: "information",
    name: "Documento",
    d: [
      "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      "M14 2v5a1 1 0 0 0 1 1h5",
      "M10 9H8",
      "M16 13H8",
      "M16 17H8",
    ],
  },
  tag: { cat: "commerce",
    name: "Etiqueta",
    d: [
      "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
      dot(7.5, 7.5),
    ],
  },
  "dollar-sign": { cat: "commerce", name: "Precio", d: ["M12 2v20", "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"] },
  percent: { cat: "commerce", name: "Descuento", d: ["M19 5 5 19", circle(6.5, 6.5, 2.5), circle(17.5, 17.5, 2.5)] },
  "credit-card": { cat: "commerce", name: "Tarjeta", d: [rect(2, 5, 20, 14, 2), "M2 10h20"] },
  "shopping-bag": { cat: "commerce",
    name: "Bolsa",
    d: [
      "M16 10a4 4 0 0 1-8 0",
      "M3.103 6.034h17.794",
      "M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z",
    ],
  },
  gift: { cat: "commerce",
    name: "Regalo",
    d: [rect(3, 8, 18, 4, 1), "M12 8v13", "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7", "M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"],
  },
  key: { cat: "home",
    name: "Llave",
    d: ["m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4", "m21 2-9.6 9.6", circle(7.5, 15.5, 5.5)],
  },
  lock: { cat: "general", name: "Candado", d: [rect(3, 11, 18, 11, 2), "M7 11V7a5 5 0 0 1 10 0v4"] },
  "shield-check": { cat: "commerce",
    name: "Garantía",
    d: [
      "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      "m9 12 2 2 4-4",
    ],
  },
  ruler: { cat: "home",
    name: "Medidas",
    d: ["M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z", "m14.5 12.5 2-2", "m11.5 9.5 2-2", "m8.5 6.5 2-2", "m17.5 15.5 2-2"],
  },
  phone: { cat: "media",
    name: "Teléfono",
    d: [
      "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
    ],
  },
  mail: { cat: "media", name: "Correo", d: ["m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7", rect(2, 4, 20, 16, 2)] },
  "message-circle": { cat: "media",
    name: "Mensaje",
    d: ["M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"],
  },
  bell: { cat: "information",
    name: "Aviso sonoro",
    d: [
      "M10.268 21a2 2 0 0 0 3.464 0",
      "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
    ],
  },
  calendar: { cat: "information", name: "Calendario", d: ["M8 2v4", "M16 2v4", rect(3, 4, 18, 18, 2), "M3 10h18"] },
  clock: { cat: "information", name: "Reloj", d: ["M12 6v6l4 2", circle(12, 12, 10)] },
  user: { cat: "general", name: "Persona", d: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", circle(12, 7, 4)] },
  users: { cat: "general",
    name: "Personas",
    d: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M16 3.128a4 4 0 0 1 0 7.744", "M22 21v-2a4 4 0 0 0-3-3.87", circle(9, 7, 4)],
  },
  share: { cat: "media",
    name: "Compartir",
    d: [circle(18, 5, 3), circle(6, 12, 3), circle(18, 19, 3), "m8.59 13.51 6.83 3.98", "m15.41 6.51-6.82 3.98"],
  },
  link: { cat: "media",
    name: "Enlace",
    d: ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
  },
  "external-link": { cat: "media",
    name: "Abrir enlace",
    d: ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"],
  },
  download: { cat: "media", name: "Descargar", d: ["M12 15V3", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5"] },
  bookmark: { cat: "general", name: "Guardar", d: ["m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"] },
  flag: { cat: "places",
    name: "Bandera",
    d: ["M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"],
  },
  lightbulb: { cat: "information",
    name: "Idea",
    d: ["M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5", "M9 18h6", "M10 22h4"],
  },
  wifi: { cat: "home", name: "Wi-Fi", d: ["M12 20h.01", "M2 8.82a15 15 0 0 1 20 0", "M5 12.859a10 10 0 0 1 14 0", "M8.5 16.429a5 5 0 0 1 7 0"] },
  droplet: { cat: "home",
    name: "Agua",
    d: ["M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"],
  },
  flame: { cat: "home",
    name: "Fuego",
    d: ["M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"],
  },
  snowflake: { cat: "home",
    name: "Clima",
    d: ["M2 12h20", "M12 2v20", "m20 16-4-4 4-4", "m4 8 4 4-4 4", "m16 4-4 4-4-4", "m8 20 4-4 4 4"],
  },
  globe: { cat: "places", name: "Mundo", d: [circle(12, 12, 10), "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", "M2 12h20"] },
  circle: { cat: "general", name: "Círculo", d: [circle(12, 12, 10)] },
  square: { cat: "general", name: "Cuadro", d: [rect(3, 3, 18, 18, 2)] },
  dot: { cat: "general", name: "Punto", d: [circle(12, 12, 3)] },
  ellipsis: { cat: "general", name: "Más opciones", d: [dot(12, 12), dot(19, 12), dot(5, 12)] },
};

// Versión "sin círculo" de los iconos que van dentro de un círculo (para ponerlos sobre un disco).
ICONS.info.bare = ["M12 17v-6", dot(12, 7.4)];
["circle-help", "circle-alert", "circle-check"].forEach((id) => {
  ICONS[id].bare = ICONS[id].d.slice(1);
});

export const ICON_CATEGORIES = [
  { id: "places", name: "Lugares y navegación" },
  { id: "home", name: "Casa e interiores" },
  { id: "commerce", name: "Comercio" },
  { id: "media", name: "Medios" },
  { id: "arrows", name: "Flechas" },
  { id: "information", name: "Información" },
  { id: "general", name: "General" },
];

export const ICON_IDS = Object.keys(ICONS);

// Icono predeterminado de cada tipo de hotspot (cuando la plantilla no trae `icon`).
export const DEFAULT_ICON_BY_TYPE = { info: "info", price: "dollar-sign", nav: "arrow-right" };

export function iconFor(type, icon) {
  return icon && ICONS[icon] ? icon : DEFAULT_ICON_BY_TYPE[type] || "info";
}

// SVG 24×24 con trazo (currentColor salvo que se pase `color`). `size` en px; sin él, el SVG
// toma el tamaño de su contenedor por CSS.
export function createIcon(id, { size, color, strokeWidth = 2, bare = false } = {}) {
  const def = ICONS[id] || ICONS.info;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", color || "currentColor");
  svg.setAttribute("stroke-width", String(strokeWidth));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  if (size) {
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
  }
  (bare && def.bare ? def.bare : def.d).forEach((d) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });
  return svg;
}
