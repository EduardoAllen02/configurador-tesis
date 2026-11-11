import {describe,it,expect} from "vitest";
import {convertLegacyElement,migrateDesignGroups,applyGroupMeasurements} from "./groupMigration.js";
const frame={anchor:"right",x:-72,y:0,w:400,h:0};
const element=(template,props={})=>({id:"original",template,frame,mobile:{mode:"hidden"},z:12,locked:false,hidden:false,props});
const all=(el)=>[el,...(el.children??[]).flatMap(all)];
describe("legacy composites to editable groups",()=>{
  it("accepts measured line wrapping without changing the outer frame or source",()=>{
    const group=convertLegacyElement(element("glass-card",{title:"Un título",body:"Un texto que cabe en una línea"}));
    const snapshot=structuredClone(group),child=group.children[0];
    const next=applyGroupMeasurements(group,{original:{props:{contentWidth:400,contentHeight:126}},[child.id]:{frame:{x:22,y:22,w:354,h:24},props:{lineHeight:1.2}}});
    expect(next.frame).toEqual(frame);
    expect(next.props.contentHeight).toBe(126);
    expect(next.children[0].frame).toMatchObject({x:22,y:22,w:354,h:24});
    expect(group).toEqual(snapshot);
  });
  it("keeps outer identity, position, mobile behavior and manual card finish",()=>{
    const source=element("glass-card",{title:"Título mío",body:"Descripción",fill:"#f00",blur:9,radius:13,children:[{template:"feature-list",props:{heading:"Incluye",items:[{icon:"layers",text:"Todos los pisos"}]}}]});
    const snapshot=structuredClone(source),next=convertLegacyElement(source);
    expect(next).toMatchObject({id:source.id,template:"group",frame:source.frame,mobile:source.mobile,z:12,props:{fill:"#f00",blur:9,radius:13}});
    expect(all(next).filter((e)=>e.template==="text").map((e)=>e.props.text)).toEqual(["Título mío","Descripción","Incluye","Todos los pisos"]);
    expect(all(next).find((e)=>e.template==="icon").props.icon).toBe("layers");
    expect(next.children.every((e)=>e.frame.anchor==="top-left")).toBe(true);
    expect(all(next).find((e)=>e.template==="text"&&e.props.text==="Título mío").props.lineHeight).toBe(1.2);
    expect(all(next).find((e)=>e.template==="text"&&e.props.text==="Descripción").props.lineHeight).toBe(1.5);
    expect(source).toEqual(snapshot);
  });
  it("counter remains a smart leaf with its original values and timing",()=>{
    const props={heading:"En números",items:[{value:29,suffix:"+",label:"Salas"}],countMs:300,rotateMs:800};
    const next=convertLegacyElement(element("stats-counter",props));
    const leaf=next.children.find((c)=>c.template==="stats-counter");
    expect(leaf.props).toMatchObject({...props,heading:"",compositeLeaf:true});
    expect(convertLegacyElement(next)).toEqual(next);
  });
  it("stats preserve every value and label as individual editable texts",()=>{
    const next=convertLegacyElement(element("stats-row",{items:[{value:"5",label:"Pisos"},{value:"12",label:"Salas"}],valueColor:"#0f0"}));
    expect(next.children.filter((e)=>e.template==="text").map((e)=>e.props.text)).toEqual(["5","Pisos","12","Salas"]);
    expect(next.children[0].props.color).toBe("#0f0");
    expect(new Set(all(next).map((e)=>e.id)).size).toBe(all(next).length);
  });
  it("migrates both screens and panels once and leaves other elements unchanged",()=>{
    const text=element("text",{text:"Intacto"});
    const source={screens:{intro:{elements:[element("glass-card")]},tour:{elements:[text]}},panels:[{id:"panel",elements:[{...element("feature-list"),id:"panel-list"}]}]};
    const next=migrateDesignGroups(source);
    expect(next.screens.tour.elements[0]).toBe(text);
    expect(next.panels[0].elements[0].template).toBe("group");
    expect(migrateDesignGroups(next)).toBe(next);
  });
});
