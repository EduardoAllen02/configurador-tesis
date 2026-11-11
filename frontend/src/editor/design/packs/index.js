import { migrateDesignGroups } from "../../../runtime/model/groupMigration.js";
import { THEMES } from "../../../runtime/theme/index.js";
import { glassDark } from "./glassDark.js";
import { minimalLight } from "./minimalLight.js";
import { bold } from "./bold.js";

// Paquetes de plantillas (el equivalente a las plantillas de diseño completas de Canva).
export const PACKS = [glassDark, minimalLight, bold].map((pack) => {
  const theme = THEMES.find((t) => t.id === pack.id);
  return { ...pack, theme, design: migrateDesignGroups({ ...pack.design, theme }) };
});
