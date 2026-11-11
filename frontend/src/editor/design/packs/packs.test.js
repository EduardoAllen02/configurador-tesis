import { describe, expect, it } from "vitest";
import { PACKS } from "./index.js";
import { getTemplate } from "../../../runtime/templates/index.js";
import { FONT_LIST } from "../../../runtime/fonts/fontList.js";
import { applyPack, hasElements, validatePack } from "../panels/logic.js";
import { LIBRARY, TEXT_STYLES, ADD_TEXT, dragPayload } from "../library.js";

const fontIds = FONT_LIST.map((f) => f.id);

describe("paquetes de plantillas", () => {
  it("hay tres, con id y nombre únicos", () => {
    expect(PACKS.map((p) => p.name)).toEqual(["Cristal oscuro", "Minimal claro", "Audaz"]);
    expect(new Set(PACKS.map((p) => p.id)).size).toBe(3);
  });

  PACKS.forEach((pack) => {
    it(`${pack.name}: es un diseño válido con plantillas existentes`, () => {
      expect(validatePack(pack, { getTemplate, fontIds })).toEqual([]);
    });

    it(`${pack.name}: cada elemento tiene id, frame y mobile`, () => {
      ["intro", "tour"].forEach((screen) => {
        pack.design.screens[screen].elements.forEach((el) => {
          expect(el.id).toBeTruthy();
          expect(el.frame.anchor).toBeTruthy();
          expect(el.mobile.mode).toMatch(/^(auto|custom|hidden)$/);
        });
      });
    });
  });

  it("validatePack detecta plantillas desconocidas, props mal escritas y fuentes fuera de la lista", () => {
    const bad = structuredClone(PACKS[0]);
    bad.design.screens.tour.elements[0].template = "no-existe";
    bad.design.screens.intro.elements[0].props.colour = "#fff";
    bad.design.brand.fonts.heading = "Comic Sans";
    bad.design.hotspotPresets.info.template = "g-title";
    const errors = validatePack(bad, { getTemplate, fontIds });
    expect(errors.join("\n")).toMatch(/plantilla de elemento desconocida "no-existe"/);
    expect(errors.join("\n")).toMatch(/prop desconocida "colour"/);
    expect(errors.join("\n")).toMatch(/fuente heading/);
    expect(errors.join("\n")).toMatch(/hotspotPresets.info/);
  });

  it("aplicar un paquete reemplaza marca, pantallas, hotspots y panel, y conserva el resto", () => {
    const design = {
      version: 1,
      brand: { colors: ["#111111"], logo: "asset:abc", radius: 2, fonts: {} },
      screens: { intro: { enabled: false, background: null, elements: [] }, tour: { elements: [] } },
      hotspotPresets: {},
      detailPanel: { template: "floating-card", props: {} },
      nadir: { mode: "limit", limitDeg: -50 },
      panoramas: { mode: "tiles" },
      languages: { list: ["es", "en"], default: "es" },
    };
    const next = applyPack(design, PACKS[0]);
    expect(next.brand.colors).toEqual(PACKS[0].design.brand.colors);
    expect(next.brand.logo).toBe("asset:abc");
    expect(next.screens.intro.enabled).toBe(true);
    expect(next.screens.tour.elements.map((e) => e.template)).toEqual(["basic-topbar", "frame-scrubber"]);
    expect(next.detailPanel.template).toBe("side-sheet");
    expect(next.nadir).toEqual(design.nadir);
    expect(next.panoramas).toEqual(design.panoramas);
    expect(next.languages).toEqual(design.languages);
    // es una copia: cambiar el diseño aplicado no toca el paquete
    next.screens.intro.elements[0].props.text = "otro";
    expect(PACKS[0].design.screens.intro.elements[0].props.text).not.toBe("otro");
    expect(hasElements(design)).toBe(false);
    expect(hasElements(next)).toBe(true);
  });
});

describe("biblioteca", () => {
  it("todos los ítems usan plantillas de elemento que existen", () => {
    [...LIBRARY, ...TEXT_STYLES, ADD_TEXT].forEach((item) => {
      const t = getTemplate(item.template);
      expect(t, item.id).toBeTruthy();
      expect(t.kind).toBe("element");
    });
  });

  it("los ids son únicos y las props sólo usan claves de la plantilla", () => {
    const all = [...LIBRARY, ...TEXT_STYLES, ADD_TEXT];
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
    all.forEach((item) => {
      const t = getTemplate(item.template);
      const known = new Set([...Object.keys(t.defaults), ...t.slots.map((s) => s.key)]);
      Object.keys(item.props).forEach((k) => expect(known.has(k), `${item.id}.${k}`).toBe(true));
    });
  });

  it("la carga del arrastre es JSON puro con la receta", () => {
    const payload = dragPayload(LIBRARY[0]);
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    expect(Object.keys(payload).sort()).toEqual(["children", "h", "name", "props", "template", "w"]);
    expect(dragPayload(LIBRARY.find((i) => i.id === "topbar")).frame.anchor).toBe("stretch-top");
    expect(dragPayload(TEXT_STYLES[0]).name).toBeNull();
  });
});
