import { describe, it, expect, vi, afterEach } from "vitest";
import { createHotspotSession, exteriorLayout, surfacePanel, visibleHotspotSurface, rebaseHotspotPlacement, sessionLayout } from "./hotspotSession.js";
import { createHotspotDetail, replaceDetailTemplate } from "../runtime/model/hotspotDetail.js";
import { updateElement, findElement } from "./design/elementOps.js";
const fixture = () => ({ id:"hs", type:"info", title:"TÃƒÂ­tulo", description:"DescripciÃƒÂ³n", image:"/image.webp", style:{template:"callout",props:{dx:48,dy:-40}}, segments:[{start:0,end:30}], content:{detail:{...createHotspotDetail(),reveal:"click"}} });
const create = (options = {}) => createHotspotSession({ hotspot:fixture(), design:{panels:[]}, markerProps:{dx:48,dy:-40}, save:vi.fn(), preview:vi.fn(), ...options });
const root = store => store.getState().design.panels.find(p => `panel:${p.id}` === store.getState().screen).elements[0];
const edit = (store,id,fn) => doc => updateElement(doc,store.getState().screen,id,fn(findElement(doc,store.getState().screen,id)));
afterEach(() => vi.useRealTimers());

describe("visible hotspot placement gestures", () => {
  it("moves from the visible card without changing its content and cancels the entire gesture", () => {
    const store=create();store.openSurface("detail");
    store.apply(edit(store,root(store).id,e=>({...e,frame:{...e.frame,anchor:"left",x:100,y:-4000}})));
    const before=structuredClone(store.getState().design), content=store.getPatch().content;
    store.beginGesture();store.preview(doc=>rebaseHotspotPlacement(doc,"detail",{x:90,y:-270}));
    store.preview(edit(store,root(store).id,e=>({...e,frame:{...e.frame,y:80}})));
    expect(store.getPatch().style.props).toMatchObject({dx:90,dy:-190});
    expect(root(store).frame.anchor).toBe("top-left");
    expect(store.getPatch().content).toEqual(content);
    expect(root(store).children.find(e=>e.bind==="image").props.asset).toBe("/image.webp");
    store.cancelGesture();expect(store.getState().design).toEqual(before);
  });
  it("commits repeated summary moves independently from click-to-open detail and survives reload", async () => {
    const store=create();store.openSurface("card");const before=store.getPatch().content;
    for(let n=0;n<2;n++) {
      store.beginGesture();store.preview(doc=>rebaseHotspotPlacement(doc,"card",{x:48,y:-40+n*30}));
      store.preview(edit(store,root(store).id,e=>({...e,frame:{...e.frame,y:30}})));
      store.endGesture("Mover");
    }
    await store.flush();expect(store.getPatch().style.props).toMatchObject({dx:48,dy:20});
    expect(store.getPatch().content).toEqual(before);
    const loaded=create({hotspot:{...fixture(),...store.getPatch()}});
    expect(loaded.getPatch()).toEqual(store.getPatch());
    store.undo();expect(store.getPatch().style.props.dy).toBe(-10);
    store.redo();expect(store.getPatch().style.props.dy).toBe(20);
  });
  it("keeps marker movement when switching to a screen detail gesture", () => {
    const hotspot=fixture();hotspot.content.detail.placement="screen";
    const store=create({hotspot});store.openSurface("card");
    store.beginGesture();store.preview(doc=>rebaseHotspotPlacement(doc,"card",{x:48,y:-40}));
    store.preview(edit(store,root(store).id,e=>({...e,frame:{...e.frame,y:30}})));store.endGesture("Mover");
    store.openSurface("detail");store.beginGesture();store.preview(doc=>rebaseHotspotPlacement(doc,"detail",{}));
    store.preview(edit(store,root(store).id,e=>({...e,frame:{...e.frame,y:20}})));store.endGesture("Mover");
    expect(store.getPatch().style.props.dy).toBe(-10);
    expect(store.getPatch().content.detail.offset).toEqual({x:0,y:20});
  });
});
describe("hotspot session", () => {
  it("has one editable composition and template changes retain the latest authored finish", () => {
    const store=create();store.openSurface("detail");
    store.apply(edit(store,root(store).id,e=>({...e,props:{...e.props,fill:"#123456",radius:27}})));
    expect(store.getState().design.hotspotLayouts.detail.elements).toBeUndefined();
    const current=sessionLayout(store.getState().design,"detail");
    store.patchLayout("detail",{...replaceDetailTemplate(current,"text","info"),geometry:"outer"},true);
    expect(root(store).props).toMatchObject({fill:"#123456",radius:27});
    expect(store.getPatch().content.detail.elements[0].props.fill).toBe("#123456");
  });
  it("opens an empty disabled legacy detail safely without saving on selection", async () => {
    const hotspot=fixture();hotspot.content.detail={...hotspot.content.detail,enabled:false,elements:[]};
    const save=vi.fn(),store=create({hotspot,save});store.openSurface("card");await store.flush();
    expect(save).not.toHaveBeenCalled();store.patchLayout("detail",{enabled:true});store.openSurface("detail");
    expect(root(store).children.some(p=>p.bind==="image")).toBe(true);
  });
  it("opening either surface preserves IDs and does not save", async () => {
    const save=vi.fn(), store=create({save}), before=structuredClone(store.getState().design);
    store.openSurface("detail"); store.openSurface("card"); await store.flush();
    expect(store.getState().design).toEqual(before); expect(save).not.toHaveBeenCalled();
  });
  it("converts old exterior geometry once without mutating the saved layout", () => {
    const source=fixture().content.detail, copy=structuredClone(source), result=exteriorLayout(source,"detail");
    expect(source).toEqual(copy); expect(result.elements[0].id).toBe(source.elements[0].id);
    expect(result.elements[0].frame.w).toBe(350); expect(exteriorLayout(result,"detail")).toEqual(result);
  });
  it("commits one gesture, preserving image, data, and unrelated surfaces through undo and redo", async () => {
    const save=vi.fn(), store=create({save});store.openSurface("detail");
    const id=root(store).children.find(e=>e.bind==="image").id, before=store.getPatch(), x=root(store).children.find(e=>e.id===id).frame.x;
    store.beginGesture(); store.preview(edit(store,id,e=>({...e,frame:{...e.frame,x:x+24}})));
    expect(save).not.toHaveBeenCalled();store.endGesture("Mover");await store.flush();const after=store.getPatch();
    expect(after.content.card).toEqual(before.content.card); expect(after.content.detail.elements[0].children.find(e=>e.id===id).frame.x).toBe(x+24);
    expect(root(store).children.find(e=>e.id===id).props.asset).toBe("/image.webp");
    store.undo();await store.flush();expect(store.getPatch()).toEqual(before);
    store.redo();await store.flush();expect(store.getPatch()).toEqual(after);expect(save).toHaveBeenCalledTimes(3);
  });
  it("cancels only the active gesture while retaining earlier committed edits", async () => {
    const store=create();store.patchData({title:"Guardado"});await store.flush();store.openSurface("detail");const before=store.getPatch();
    store.beginGesture();store.preview(edit(store,root(store).id,e=>({...e,frame:{...e.frame,w:999}})));store.cancelGesture();
    expect(store.getPatch()).toEqual(before);expect(store.getPatch().title).toBe("Guardado");
  });
  it("binds edited text to both surfaces but serializes bindings without duplicate literal content", async () => {
    const store=create();store.openSurface("detail");const title=root(store).children.find(e=>e.bind==="title");
    store.apply(edit(store,title.id,e=>({...e,props:{...e.props,text:"Nuevo tÃƒÂ­tulo"}})));await store.flush();
    expect(store.getPatch().title).toBe("Nuevo tÃƒÂ­tulo");expect(store.getPatch().content.detail.elements[0].children.find(e=>e.id===title.id).props.text).toBe("");
    store.openSurface("card");expect(root(store).children.find(e=>e.bind==="title").props.text).toBe("Nuevo tÃƒÂ­tulo");
  });
  it("retains local edits on failed save and retries the latest document", async () => {
    vi.useFakeTimers();const save=vi.fn().mockRejectedValueOnce(Error("Sin red")).mockResolvedValue({}),store=create({save});
    store.patchData({title:"Pendiente"});await expect(store.flush()).rejects.toThrow("Sin red");
    expect(store.getState().status).toBe("error");expect(store.getPatch().title).toBe("Pendiente");
    store.patchData({title:"ÃƒÅ¡ltima versiÃƒÂ³n"});await store.flush();expect(store.getState().status).toBe("saved");expect(save.mock.lastCall[0].title).toBe("ÃƒÅ¡ltima versiÃƒÂ³n");
  });
  it("keeps automatic appearance props and toggled bindings available after template replacement", async () => {
    const store=create();const layout={...createHotspotDetail(),geometry:"outer"};store.patchLayout("detail",layout,true);
    store.openSurface("detail");expect(root(store).props.fill).toBeUndefined();
    const image=root(store).children.find(e=>e.bind==="image");expect(image.hidden).toBeUndefined();
    store.patchData({image:"/other.webp"});await store.flush();expect(root(store).children.find(e=>e.id===image.id).props.asset).toBe("/other.webp");
  });
  it("exposes legacy details as editable groups without writing on entry", async () => {
    const hotspot=fixture();delete hotspot.content.detail;const save=vi.fn(),store=create({hotspot,save});
    store.openSurface("detail");await store.flush();expect(root(store).template).toBe("group");expect(store.getPatch().content.detail.legacy).toBeUndefined();expect(save).not.toHaveBeenCalled();
  });
  it("selects the visible detail instead of a hidden summary for always-visible cards", () => {
    const hotspot=fixture();hotspot.content.detail.reveal="always";const store=create({hotspot});store.openSurface("card");
    expect(store.getState().screen).toBe(surfacePanel("detail"));
    expect(root(store).children.some(e=>e.bind==="image")).toBe(true);
  });
  it("resolves editing surfaces without changing click-to-open or corner behavior", () => {
    expect(visibleHotspotSurface("detail",{enabled:false})).toBe("card");
    expect(visibleHotspotSurface("card",{enabled:true,placement:"inline",reveal:"click"})).toBe("card");
    expect(visibleHotspotSurface("card",{enabled:true,placement:"screen",reveal:"always"})).toBe("card");
  });
  it("leaves the detail preview when switching back to click, but allows explicitly editing it again", () => {
    const detail={enabled:true,placement:"inline",reveal:"click"};
    expect(visibleHotspotSurface("detail",detail,"always")).toBe("card");
    expect(visibleHotspotSurface("detail",detail,"click")).toBe("detail");
    expect(visibleHotspotSurface("detail",detail)).toBe("detail");
    expect(visibleHotspotSurface("detail",{...detail,placement:"screen"},"always")).toBe("detail");
  });
  it("stores screen movement independently from authored content and legacy anchor", async () => {
    const hotspot=fixture();hotspot.content.detail.placement="screen";hotspot.content.detail.elements[0].frame={anchor:"center",x:12,y:8,w:320,h:400};
    const store=create({hotspot});store.openSurface("detail");store.apply(edit(store,root(store).id,e=>({...e,frame:{...e.frame,x:20,y:10}})));await store.flush();
    expect(store.getPatch().content.detail.offset).toEqual({x:20,y:10});expect(store.getPatch().content.detail.elements[0].frame).toMatchObject({anchor:"center",x:12,y:8});
  });
});
