import { expect, it, vi } from "vitest";
import { removeResetFragment, resetPasswordError, resetTokenFromFragment } from "./passwordRecovery.js";

it("reads only a bounded fragment token; neither query values nor malformed links are accepted", () => {
  expect(resetTokenFromFragment("#token=aaa.bbb.ccc")).toBe("aaa.bbb.ccc");
  for (const value of ["", "?token=aaa.bbb.ccc", "#token=%3Cscript%3E", "#token=" + "a".repeat(2049), "#token=aaa.bbb"]) expect(resetTokenFromFragment(value)).toBe("");
});

it("clears the secret URL while preserving router state and the current route", () => {
  const history = { state: { idx: 1, key: "route" }, replaceState: vi.fn() };
  removeResetFragment({ pathname: "/reset-password", search: "", hash: "#token=aaa.bbb.ccc" }, history);
  expect(history.replaceState).toHaveBeenCalledWith(history.state, "", "/reset-password");
  history.replaceState.mockClear();
  removeResetFragment({ pathname: "/reset-password", search: "", hash: "" }, history);
  expect(history.replaceState).not.toHaveBeenCalled();
});

it("matches backend Unicode and bcrypt byte limits and requires confirmation", () => {
  expect(resetPasswordError("12345678", "12345678")).toBe(null);
  expect(resetPasswordError("1234567", "1234567")).toMatch(/8/);
  expect(resetPasswordError("🔒".repeat(4), "🔒".repeat(4))).toMatch(/8/);
  expect(resetPasswordError("🔒".repeat(18), "🔒".repeat(18))).toBe(null);
  expect(resetPasswordError("🔒".repeat(19), "🔒".repeat(19))).toMatch(/demasiado larga/);
  expect(resetPasswordError("12345678", "12345679")).toMatch(/coinciden/);
});
