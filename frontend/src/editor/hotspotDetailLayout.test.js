import { expect, it } from "vitest";
import { createHotspotDetail, detailElements } from "../runtime/model/hotspotDetail.js";
import { detailLayout, editDetailPiece, resizeDetailHeight, resizeDetailWidth, setDetailAutoLayout } from "./hotspotDetailLayout.js";

it("narrows the actual content without scaling its fonts or losing bindings/mobile frames", () => {
  const detail = createHotspotDetail();
  detail.elements[0].mobile = { mode: "custom", frame: { w: 280, h: 400 } };
  const next = resizeDetailWidth(detail, 240);
  expect(next.elements[0].frame.w).toBe(240);
  expect(next.elements[0].props.contentWidth).toBe(240);
  expect(next.elements[0].children[0].frame).toMatchObject({ x: 16, w: 208, h: 160 });
  expect(next.elements[0].children[1].props.size).toBe(22);
  expect(next.elements[0].children[1].bind).toBe("title");
  expect(next.elements[0].mobile).toEqual(detail.elements[0].mobile);
  expect(detail.elements[0].frame.w).toBe(320);
});

it("font/image controls share the canvas pieces and automatic layout closes the gaps", () => {
  const detail = createHotspotDetail();
  const { texts, images } = detailLayout(detail);
  const compact = editDetailPiece(editDetailPiece(detail, texts[0].id, { props: { size: 14 } }), images[0].id, { frame: { h: 80, w: 200 }, props: { fit: "contain" } });
  expect(detailLayout(compact).texts[0].props.size).toBe(14);
  expect(detailLayout(compact).images[0]).toMatchObject({ bind: "image", props: { fit: "contain" }, frame: { w: 200, h: 80 } });
  const rendered = detailElements(compact, { title: "Cocina", image: "/photo.webp", description: "Texto" })[0];
  const title = rendered.children.find((piece) => piece.bind === "title");
  const description = rendered.children.find((piece) => piece.bind === "description");
  expect(title.frame).toMatchObject({ y: 108, h: 0 });
  expect(description.frame.y).toBe(141);
  expect(detailLayout(detail).texts[0].props.size).toBe(22);
});

it("fixed height can return to natural sizing without changing the content", () => {
  const detail = createHotspotDetail();
  const fixed = resizeDetailHeight(detail, 220);
  expect(detailLayout(fixed).height).toBe(220);
  expect(fixed.elements[0].props).toMatchObject({ detailFixedHeight: true, autoFit: true, contentHeight: 0 });
  const automatic = resizeDetailHeight(fixed, 0);
  expect(detailLayout(automatic).height).toBe(0);
  expect(automatic.elements[0].frame.h).toBe(0);
  expect(automatic.elements[0].children).toEqual(detail.elements[0].children);
});

it("automatic arrangement can be restored after custom canvas edits, clearing reserved text heights", () => {
  const detail = createHotspotDetail();
  detail.elements[0].props.detailAutoLayout = false;
  const next = setDetailAutoLayout(detail, true);
  expect(next.elements[0].props.detailAutoLayout).toBe(true);
  expect(detailLayout(next).texts.every((piece) => piece.frame.h === 0)).toBe(true);
  expect(detailLayout(detail).texts[0].frame.h).toBe(44);
});
