import { findElement, parentOf, updateElement, updateProps, newElementId } from "./elementOps.js";
import { statsCounter } from "../../runtime/templates/elements/statsCounter.js";
import { statsRow } from "../../runtime/templates/elements/statsRow.js";

export const MAX_SECTIONS = 8;
const kindOf = (el) => ["stats-counter", "stats-row"].includes(el?.template) ? el.template : el?.template === "group" && ["stats-counter", "stats-row"].includes(el.props?.legacyTemplate) ? el.props.legacyTemplate : null;
const descend = (el) => kindOf(el) ? el : (el?.children ?? []).map(descend).find(Boolean);

// Configuration follows the semantic element, even when a converted piece is selected.
export function numberConfiguration(design, screen, id) {
  let el = findElement(design, screen, id);
  const selected = el;
  while (el && !kindOf(el)) el = parentOf(design, screen, el.id);
  el ??= descend(selected);
  if (!el) return null;
  const kind = kindOf(el);
  const leaf = kind === "stats-counter" && el.template === "group" ? el.children?.find((child) => child.template === "stats-counter") : el;
  if (!leaf) return null;
  let parent = el, locked = false;
  while (parent) { locked ||= !!parent.locked; parent = parentOf(design, screen, parent.id); }
  locked ||= (el.children ?? []).some((child) => child.locked);
  return { id: el.id, element: el, leaf, kind, locked };
}

export function sectionValues(config) {
  const { element, leaf, kind } = config;
  if (kind === "stats-row" && element.template === "group") {
    const texts = (element.children ?? []).filter((child) => child.template === "text");
    return Array.from({ length: Math.ceil(texts.length / 2) }, (_, index) => ({ key: texts[index * 2].id, value: texts[index * 2].props.text ?? "", label: texts[index * 2 + 1]?.props.text ?? "" })).slice(0, MAX_SECTIONS);
  }
  return (leaf.props?.items ?? (kind === "stats-counter" ? statsCounter : statsRow).defaults.items).slice(0, MAX_SECTIONS).map((item, index) => ({ ...item, key: String(index) }));
}

export function resizeSections(items, count, kind) {
  const size = Math.max(1, Math.min(MAX_SECTIONS, Number(count) || 1));
  const rows = items.slice(0, size);
  while (rows.length < size) rows.push({ key: newElementId(), value: kind === "stats-counter" ? 0 : "0", label: `Sección ${rows.length + 1}`, ...(kind === "stats-counter" ? { suffix: "", direction: "up" } : {}) });
  return rows;
}

export function writeNumberSections(design, screen, id, items, options = {}) {
  const config = numberConfiguration(design, screen, id);
  if (!config || config.locked) return design;
  const { element, leaf, kind } = config;
  const rows = items.slice(0, MAX_SECTIONS);
  if (!rows.length) return design;
  if (kind === "stats-counter" || element.template !== "group") {
    return updateProps(design, screen, leaf.id, { ...options, items: rows.map(({ key, ...row }) => row) });
  }
  const prior = sectionValues(config), texts = element.children.filter((child) => child.template === "text");
  const structural = prior.length !== rows.length || prior.some((item, index) => item.key !== rows[index]?.key);
  const width = element.props.contentWidth || element.frame?.w || 360;
  const columns = Math.min(4, rows.length), cell = width / columns;
  const labelSize = texts[1]?.props.size || 10.5;
  const rowHeight = Math.max(64, ...rows.map((item) => 40 + Math.ceil(String(item.label).length * labelSize * .65 / Math.max(20, cell - 16)) * labelSize * 1.5));
  const separator = element.children.find((child) => child.template === "shape") ?? { template: "shape", props: { fill: "rgba(255,255,255,.15)", radius: 0, glass: false, shadow: false, borderWidth: 0 }, frame: { anchor: "top-left", w: 1, h: 47.3 } };
  const children = [];
  rows.forEach((item, index) => {
    const old = prior.findIndex((row) => row.key === item.key);
    for (const [offset, field] of [[0, "value"], [1, "label"]]) {
      const source = texts[(old < 0 ? 0 : old) * 2 + offset] ?? texts[offset] ?? { template: "text", props: { variant: offset ? "kicker" : "title", size: offset ? 10.5 : 26 }, frame: { anchor: "top-left", x: 0, y: offset ? 33 : 0, w: cell - 16, h: offset ? 0 : 31.2 } };
      const child = { ...source, id: old < 0 || !source.id ? newElementId() : source.id, props: { ...source.props, text: String(item[field] ?? "") } };
      if (structural) { child.frame = { ...child.frame, x: index % columns * cell + (index % columns ? 12 : 0), y: Math.floor(index / columns) * rowHeight + (offset ? 33 : 0), w: cell - 16, h: offset ? 0 : source.frame.h }; child.z = children.length; }
      children.push(child);
    }
    if (structural && index % columns && separator) children.push({ ...separator, id: newElementId(), z: children.length, frame: { ...separator.frame, x: index % columns * cell, y: Math.floor(index / columns) * rowHeight, h: rowHeight - 12 } });
  });
  if (!structural) children.push(...element.children.filter((child) => child.template !== "text"));
  const height = Math.ceil(rows.length / columns) * rowHeight;
  return updateElement(design, screen, element.id, { children, ...(structural ? {
    props: { ...element.props, autoFit: true, contentHeight: height },
    frame: { ...element.frame, h: element.frame?.h > 0 ? element.frame.h * height / (element.props.contentHeight || 47.3) : 0 },
  } : {}) });
}
