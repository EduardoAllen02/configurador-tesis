import { it, expect } from "vitest";
import { createDetailState } from "./detailState.js";
const inline = (reveal = "click", enabled = true) => ({enabled,placement:"inline",reveal});
it("preview cleanup preserves independent visitor intent", () => {
  const state=createDetailState();state.configure(inline());
  state.toggle();state.preview(true);state.preview(false);expect(state.open).toBe(true);
  state.toggle();expect(state.open).toBe(false);
});
it("policy changes reset visitor expansion without serializing preview state", () => {
  const state=createDetailState();state.configure(inline());state.toggle();
  state.configure(inline("always"));expect(state.open).toBe(true);
  state.configure(inline());expect(state.open).toBe(false);
  state.preview(true);expect(state.open).toBe(true);
  state.configure(inline("click",false));expect(state.open).toBe(false);
  state.preview(false);state.configure(inline());expect(state.open).toBe(false);
});
it("metadata/layout updates preserve click state, and screen detail never opens inline", () => {
  const state=createDetailState();state.configure(inline());state.toggle();
  state.configure({...inline(),elements:[{id:"changed-image"}]});expect(state.open).toBe(true);
  state.configure({...inline(),placement:"screen"});state.preview(true);expect(state.open).toBe(false);
  state.preview(false);state.configure(inline());expect(state.open).toBe(false);
});
