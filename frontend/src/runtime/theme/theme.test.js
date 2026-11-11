import { describe, it, expect } from "vitest";
import { THEMES, applyDesignTheme, applyElementTheme, resolveThemeProps, themeVariables, validateTheme, TRANSPARENT } from "./index.js";
import { finishStyle } from "../templates/elements/common.js";
const frame = { anchor: "top-left", x: 18, y: 22, w: 300, h: 80 };
const design = () => ({ brand: { logo: "asset:logo" }, screens: { intro: { enabled: true, elements: [{ id: "a", template: "glass-card", frame: { ...frame }, props: { title: "Mi texto", fill: "#fa0000", glass: false } }, { id: "b", template: "text", frame: { ...frame, x: 400 }, props: { variant: "title", text: "Otro título" } }] }, tour: { elements: [{ id: "c", template: "button", frame: { ...frame }, props: { label: "Visitar", action: { type: "enter" } } }] } } });
describe("temas del diseño", () => {
  THEMES.forEach((theme) => it(`${theme.id} tiene tokens y roles válidos`, () => expect(validateTheme(theme)).toEqual([])));
  it("aplicar tema conserva pantallas, frames, textos, ids y overrides por defecto", () => {
    const source = design(), snapshot = structuredClone(source);
    const next = applyDesignTheme(source, THEMES[1]);
    expect(next.screens).toBe(source.screens);
    expect(next.screens).toEqual(snapshot.screens);
    expect(next.brand).toBe(source.brand);
    expect(next.theme.id).toBe("minimal-light");
    expect(source).toEqual(snapshot);
  });
  it("quitar manuales solo elimina estilos, también dentro de grupos", () => {
    const source = design();
    source.screens.intro.elements[0].children = [{ id: "child", template: "text", props: { text: "Conservar", color: "#f00" }, frame }];
    const next = applyDesignTheme(source, THEMES[1], { clearOverrides: true });
    expect(next.screens.intro.elements[0].props).toEqual({ title: "Mi texto" });
    expect(next.screens.intro.elements[0].children[0].props).toEqual({ text: "Conservar" });
    expect(next.screens.intro.elements.map((e) => e.frame)).toEqual(source.screens.intro.elements.map((e) => e.frame));
    expect(source.screens.intro.elements[0].props.fill).toBe("#fa0000");
  });
  it("aplicar a este solo cambia las props de un elemento y no cambia el tema global", () => {
    const source = design(), next = applyElementTheme(source, "intro", "a", THEMES[2]);
    expect(next.theme).toBeUndefined();
    expect(next.screens.intro.elements[0].props.fill).toBe(THEMES[2].styles.card.fill);
    expect(next.screens.intro.elements[0].props.title).toBe("Mi texto");
    expect(next.screens.intro.elements[0].frame).toEqual(frame);
    expect(next.screens.intro.elements[1]).toEqual(source.screens.intro.elements[1]);
    expect(next.screens.tour).toBe(source.screens.tour);
  });
  it("aplicar solo una tarjeta copia colores y fuentes legibles de esa plantilla", () => {
    const next = applyElementTheme(design(), "intro", "a", THEMES[1]);
    expect(next.screens.intro.elements[0].props).toMatchObject({ fill: "#ffffff", color: "#1a1a18", secondaryColor: "#55534e", headingFont: "DM Sans" });
  });
  it("aplicar a este funciona en paneles reutilizables", () => {
    const source = { panels: [{ id: "sheet", elements: design().screens.intro.elements }] };
    const next = applyElementTheme(source, "panel:sheet", "a", THEMES[1]);
    expect(next.panels[0].elements[0].props.fill).toBe("#ffffff");
    expect(next.panels[0].elements[1]).toEqual(source.panels[0].elements[1]);
  });
  it("resolver respeta colores transparentes, false y cero; automático usa el rol", () => {
    const props = resolveThemeProps("glass-card", { fill: TRANSPARENT, glass: false, blur: 0, radius: 0 }, THEMES[1]);
    expect(props).toMatchObject({ fill: TRANSPARENT, glass: false, blur: 0, radius: 0, shadow: false, borderWidth: 0 });
    expect(resolveThemeProps("text", { variant: "title", color: "", font: "" }, THEMES[1])).toMatchObject({ color: "#1a1a18", font: "DM Sans" });
  });
  it("el tinte modifica un cristal con fondo automático", () => expect(resolveThemeProps("glass-card", { fill: "", tint: "rgba(50,80,90,.5)" }, THEMES[0]).fill).toBe("rgba(50,80,90,.5)"));
  it("cristal apagado con transparente no pinta fondo, desenfoque, borde ni sombra", () => {
    const style = finishStyle(resolveThemeProps("glass-card", { fill: TRANSPARENT, glass: false }, THEMES[0]));
    expect(style).toMatchObject({ background: TRANSPARENT, backdropFilter: "none", border: "none", boxShadow: "none" });
  });
  it("las variables rechazan CSS inyectado y acotan números", () => {
    const vars = themeVariables({ id: "minimal-light", tokens: { text: "red; display:none", radius: 9999, blur: -3 } });
    expect(vars["--tour-theme-text"]).toBe("#f6f8fb");
    expect(vars["--tour-theme-radius"]).toBe("400px");
    expect(vars["--tour-theme-blur"]).toBe("0px");
  });
});

describe("group local style",()=>{
 it("applies a local theme to automatic children while leaving its sibling and geometry intact",()=>{
   const first={id:"one",template:"group",frame,props:{contentWidth:300},children:[{id:"text",template:"text",frame,props:{variant:"title",text:"Conservar"}}]};
   const second={...first,id:"two",children:[{...first.children[0],id:"second-text"}]};
   const source={theme:THEMES[1],screens:{intro:{elements:[first,second]}}};
   const next=applyElementTheme(source,"intro","one",THEMES[2]);
   const selected=next.screens.intro.elements[0];
   expect(selected.props.themeOverride.id).toBe("bold");
   expect(resolveThemeProps("text",selected.children[0].props,selected.props.themeOverride)).toMatchObject({color:"#ffffff",font:"Manrope",text:"Conservar"});
   expect(next.screens.intro.elements[1]).toEqual(second);
   expect(selected.frame).toBe(frame);
   expect(selected.children).toEqual(first.children);
   const clear=applyDesignTheme(next,THEMES[0],{clearOverrides:true});
   expect(clear.screens.intro.elements[0].props.themeOverride).toBeUndefined();
 });
});
