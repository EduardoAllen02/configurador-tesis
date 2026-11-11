import { afterEach, expect, it, vi } from "vitest";
import { createCardPresenter } from "./cardPresenter.js";
import { createDetailState } from "./detailState.js";
import { mountDetailContent } from "./detailView.js";
vi.mock("./detailView.js",()=>({mountDetailContent:vi.fn(()=>Object.assign(vi.fn(),{update:vi.fn(()=>true)}))}));
class Node {
  children=[];dataset={};hidden=false;style={setProperty() {},removeProperty() {}};
  constructor(cls="") { this.className=cls; this.classList={add:n=>this.toggle(n,true),toggle:(n,v)=>this.toggle(n,v),contains:n=>this.className.split(" ").includes(n)}; }
  toggle(n,v) { const set=new Set(this.className.split(" ").filter(Boolean));v?set.add(n):set.delete(n);this.className=[...set].join(" "); }
  setAttribute() {}
  append(n) { this.children.push(n);n.parent=this; }
  prepend(n) { this.children.unshift(n);n.parent=this; }
  insertBefore(n,b) { const i=this.children.indexOf(b);i<0?this.append(n):(this.children.splice(i,0,n),n.parent=this); }
  remove() { if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this); }
  matches(s) { return s.split(",").some(cls=>this.className.split(" ").includes(cls.slice(1))); }
  querySelector(s) { return this.children.find(n=>n.matches(s)) || this.children.map(n=>n.querySelector(s)).find(Boolean); }
  contains(n) { return n===this || this.children.some(c=>c.contains(n)); }
  closest() { return null; }
}
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
const layout=(id,w,h)=>({version:1,geometry:"outer",enabled:true,placement:"inline",reveal:"click",elements:[{id,template:"group",frame:{w,h,x:0,y:0},props:{fill:"#345",autoFit:false},children:[]}]});
it("owns both compositions, reuses nodes, and preserves authored finish and bounds across mode/visibility changes",()=>{
  vi.stubGlobal("document",{createElement:()=>new Node()});
  const content=new Node(), card=new Node("hs-co-card"), foot=new Node("hs-co-foot");card.append(foot);content.append(card);
  const h={id:"h",content:{card:layout("summary",150,100),detail:layout("detail",200,220)}};
  const state=createDetailState();state.configure(h.content.detail);
  const props={dx:50,dy:-40,fill:"#abc"},ctx={mode:"edit",mobile:false};
  const presenter=createCardPresenter(content,h,props,ctx,state);
  expect(mountDetailContent).toHaveBeenCalledTimes(2);
  expect(card.style.width).toBe("150px");expect(card.style.background).toBe("transparent");
  const body=card.querySelector(".hs-detail-body"),summary=card.querySelector(".hs-marker-card-body");
  expect(body.hidden).toBe(true);expect(summary.hidden).toBe(false);
  state.preview(true);presenter.paint();expect(card.style.width).toBe("200px");expect(body.hidden).toBe(false);expect(summary.hidden).toBe(true);
  presenter.update(h,props,{...ctx,mode:"view"});
  expect(mountDetailContent).toHaveBeenCalledTimes(2);expect(card.querySelector(".hs-detail-body")).toBe(body);
  expect(mountDetailContent.mock.calls[1][1].elements[0].props.fill).toBe("#345");
  expect(mountDetailContent.mock.results[1].value.update.mock.calls[0][0].elements[0].frame).toEqual({w:200,h:220,x:0,y:0});
  state.preview(false);presenter.paint();expect(card.style.width).toBe("150px");
  presenter.click({target:card});expect(state.open).toBe(true);
  presenter.click({target:foot});expect(state.open).toBe(false);
  presenter.dispose();expect(card.children).toEqual([foot]);
});
