import { expect, it } from "vitest";
import { exteriorLayout } from "./hotspotSurface.js";
import { createHotspotDetail } from "./hotspotDetail.js";
it("shares one idempotent legacy conversion without mutating data or bindings", () => {
  const source=createHotspotDetail(), copy=structuredClone(source);
  const next=exteriorLayout(source,"detail");
  expect(source).toEqual(copy);expect(exteriorLayout(next,"detail")).toEqual(next);
  expect(next.elements[0].frame.w).toBe(350);
  expect(next.elements[0].children.map(p=>[p.id,p.bind])).toEqual(source.elements[0].children.map(p=>[p.id,p.bind]));
});
it("empty optional surfaces remain safe and do not acquire invented elements", () => {
  const source={version:1,enabled:false,placement:"inline",elements:[]};
  expect(exteriorLayout(source,"detail")).toEqual(source);
});
it("v1 legacy panels become the same local group in both readers", () => {
  const source={version:1,placement:"screen",legacyPanel:{id:"old"},elements:[
    {id:"a",template:"text",frame:{anchor:"top-left",x:10,y:20,w:100,h:30}},
    {id:"b",template:"text",frame:{anchor:"top-left",x:30,y:70,w:140,h:40}},
  ]};
  const converted=exteriorLayout(source,"detail");expect(source.legacyPanel).toEqual({id:"old"});
  expect(converted.legacyPanel).toBeUndefined();expect(converted.elements[0].template).toBe("group");
  expect(converted.elements[0].children.map(e=>e.id)).toEqual(["a","b"]);
  expect(exteriorLayout(converted,"detail")).toEqual(converted);
});
