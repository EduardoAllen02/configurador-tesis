import { groupElement } from "./group.js";
import { iconElement } from "./icon.js";
import "./elements.css";
import { basicTopbar } from "./basicTopbar.js";
import { frameScrubber } from "./frameScrubber.js";
import { textElement } from "./text.js";
import { buttonElement } from "./button.js";
import { imageElement } from "./image.js";
import { shapeElement } from "./shape.js";
import { glassCard } from "./glassCard.js";
import { featureList } from "./featureList.js";
import { statsCounter } from "./statsCounter.js";
import { statsRow } from "./statsRow.js";
import { languageToggle } from "./languageToggle.js";
import { loaderElement } from "./loader.js";

// Plantillas de elementos de pantalla (kind: "element": HUD del recorrido y pantalla de
// inicio). Dueño en la Oleada 2: B3. El orden es el de la galería del editor.
export const elementTemplates = [
  groupElement,
  iconElement,
  textElement,
  buttonElement,
  imageElement,
  shapeElement,
  glassCard,
  featureList,
  statsCounter,
  statsRow,
  languageToggle,
  loaderElement,
  basicTopbar,
  frameScrubber,
];
