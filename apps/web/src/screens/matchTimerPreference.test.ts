// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { loadMatchTimerPreference, saveMatchTimerPreference } from "./matchTimerPreference";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem("aegis:match-timer");
});

it("defaults to enabled for missing and malformed preferences", () => {
  expect(loadMatchTimerPreference()).toBe(true);
  localStorage.setItem("aegis:match-timer", "garbage");
  expect(loadMatchTimerPreference()).toBe(true);
});

it("keeps the lobby usable when storage is blocked or full", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(loadMatchTimerPreference()).toBe(true);
  expect(() => saveMatchTimerPreference(true)).not.toThrow();
});

it("remembers an explicit opt-out", () => {
  saveMatchTimerPreference(false);
  expect(loadMatchTimerPreference()).toBe(false);
  saveMatchTimerPreference(true);
  expect(loadMatchTimerPreference()).toBe(true);
});
