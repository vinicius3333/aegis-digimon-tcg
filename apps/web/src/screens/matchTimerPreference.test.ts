// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { loadMatchTimerPreference, saveMatchTimerPreference } from "./matchTimerPreference";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem("aegis:match-timer");
});

it("ignores missing and malformed preferences", () => {
  expect(loadMatchTimerPreference()).toBe(false);
  localStorage.setItem("aegis:match-timer", "garbage");
  expect(loadMatchTimerPreference()).toBe(false);
});

it("keeps the lobby usable when storage is blocked or full", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(loadMatchTimerPreference()).toBe(false);
  expect(() => saveMatchTimerPreference(true)).not.toThrow();
});
