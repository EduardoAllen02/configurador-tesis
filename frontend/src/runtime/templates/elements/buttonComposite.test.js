import { afterEach, describe, expect, it, vi } from "vitest";
import { convertLegacyElement } from "../../model/groupMigration.js";
import { groupElement } from "./group.js";
import { textElement } from "./text.js";
import { iconElement } from "./icon.js";
import { scaleElement } from "../../model/elementResize.js";
import { updateElement, updateProps, findElement, groupElements } from "../../../editor/design/elementOps.js";
import { createDesignStore } from "../../../editor/design/designStore.js";
import { selectionGrouping, ungroupSelection } from "../../../editor/design/actions.js";

// Minimal DOM exercises actual template composition and native root semantics;
// geometry is covered by browser QA and the shared frame/gesture tests.
class Node {
  constructor(tag) {
    this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.handlers={};this.className="";
    this.style={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};
    this.classList={add:(...names)=>{this.className+=" "+names.join(" ");}};
    if(this.tagName==="BUTTON")this.disabled=false;
  }
  append(...nodes){nodes.forEach(node=>{this.children.push(node);node.parentElement=this;});}
  appendChild(node){this.append(node);return node;}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(key,value){this.attrs[key]=String(value);}
  getAttribute(key){return this.attrs[key]??null;}
  removeAttribute(key){delete this.attrs[key];}
  toggleAttribute(key,on){if(on)this.setAttribute(key,"");else this.removeAttribute(key);}
  addEventListener(type,fn){this.handlers[type]=fn;}
  get firstChild(){return this.children[0]||null;}
  get offsetHeight(){return parseFloat(this.style.height)||parseFloat(this.style.fontSize)*Number(this.style.lineHeight||1.2)||0;}
  get scrollHeight(){return this.offsetHeight;}
}
const getTemplate=id=>({text:textElement,icon:iconElement,group:groupElement})[id];
const source=(variant="primary",action={type:"goToScene",target:"next"})=>({id:"cta",template:"button",frame:{anchor:"top-left",x:100,y:80,w:240,h:0},mobile:{mode:"custom",frame:{anchor:"top-left",x:20,y:180,w:300,h:0}},props:{label:"Explorar",variant,icon:"arrow-right",action}});
const propsOf=group=>({...groupElement.defaults,...group.props,children:group.children,width:group.frame.w,height:group.frame.h});

afterEach(()=>vi.unstubAllGlobals());
describe("editable button composition",()=>{
  for(const variant of ["primary","glass","ghost"])it(`keeps ${variant} appearance, real button behavior and editable text identity`,()=>{
    vi.stubGlobal("document",{createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag)});
    const input=source(variant),group=convertLegacyElement(input),snapshot=structuredClone(group),goToScene=vi.fn();
    expect(convertLegacyElement(group)).toEqual(group);
    expect(group.children[0].frame.h).toBe(0); // font edits keep the measured text box current
    expect(group.frame).toEqual(input.frame);expect(group.mobile).toMatchObject(input.mobile);
    const root=groupElement.render(propsOf(group),{getTemplate,goToScene,ready:true});
    expect(root.tagName).toBe("BUTTON");expect(root.getAttribute("type")).toBe("button");
    expect(root.className).toContain(`tour-rt-btn--${variant}`);
    expect(root.getAttribute("aria-label")).toBe("Explorar");
    root.handlers.click();expect(goToScene).toHaveBeenCalledWith("next");
    const piece=root.children[0].children[0];
    expect(piece.dataset.elId).toBe(group.children[0].id);
    expect(piece.children[0].className).toContain("tour-rt-text");
    expect(group).toEqual(snapshot);groupElement.dispose(root);
  });

  it("preserves waiting semantics and safe external links after serialization",()=>{
    vi.stubGlobal("document",{createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag)});
    const group=JSON.parse(JSON.stringify(convertLegacyElement(source("glass",{type:"enter"})))),enter=vi.fn();
    const root=groupElement.render(propsOf(group),{getTemplate,enter,ready:false});
    expect(root.disabled).toBe(true);root.handlers.click();expect(enter).not.toHaveBeenCalled();
    const linked=groupElement.update(root,{...propsOf(group),action:{type:"openUrl",target:"https://example.com/tour"}},{getTemplate,ready:true});
    expect(linked.tagName).toBe("A");expect(linked.getAttribute("href")).toBe("https://example.com/tour");
    expect(linked.getAttribute("target")).toBe("_blank");expect(linked.getAttribute("rel")).toContain("noopener");
    expect(linked.children[0].children.every(piece=>piece.tagName!=="BUTTON")).toBe(true);
    groupElement.dispose(linked);
  });

  it("persists text typography and independent resize with undo, without changing the button action",()=>{
    const original=source(),group=convertLegacyElement(original),text=group.children[0],store=createDesignStore({migrate:false});
    store.load({screens:{tour:{elements:[group]}}});store.enterGroup(group.id);store.select(text.id);
    store.apply(doc=>updateProps(doc,"tour",text.id,{text:"Detalle",font:"manrope",size:25,weight:700,italic:true}));
    const selected=findElement(store.getState().design,"tour",text.id),scaled=scaleElement(selected,1.2);
    store.apply(doc=>updateElement(doc,"tour",text.id,scaled));
    expect(findElement(store.getState().design,"tour",text.id).props).toMatchObject({text:"Detalle",font:"manrope",size:30,weight:700,italic:true});
    expect(findElement(store.getState().design,"tour",group.id).props.action).toEqual(original.props.action);
    const persisted=JSON.parse(JSON.stringify(store.getState().design));
    expect(findElement(persisted,"tour",text.id).props.size).toBe(30);
    store.undo();expect(findElement(store.getState().design,"tour",text.id).props.size).toBe(25);
    store.undo();expect(findElement(store.getState().design,"tour",text.id).props.text).toBe("Explorar");
    store.redo();expect(findElement(store.getState().design,"tour",text.id).props.font).toBe("manrope");
  });

  it("keeps the semantic button intact when an ordinary enclosing group is ungrouped",()=>{
    const button=convertLegacyElement(source()),leaf={id:"other",template:"text",props:{text:"Info"},frame:{anchor:"top-left",x:100,y:180,w:100,h:30}};
    const doc={screens:{tour:{elements:[button,leaf]}}},boxes=[{id:button.id,left:100,top:80,width:240,height:44.2},{id:leaf.id,left:100,top:180,width:100,height:30}];
    const grouped=groupElements(doc,"tour",[button.id,leaf.id],boxes),store=createDesignStore({migrate:false});
    store.load(grouped.design);store.select(grouped.id);
    expect(ungroupSelection(store,boxes)).toEqual([button.id,leaf.id]);
    expect(findElement(store.getState().design,"tour",button.id).props.action).toEqual(source().props.action);
    store.select(button.id);expect(selectionGrouping(store).canUngroup).toBe(false);
    expect(ungroupSelection(store,boxes)).toEqual([]);
  });
});
