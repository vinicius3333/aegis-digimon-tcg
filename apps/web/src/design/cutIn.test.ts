// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cutInFromEvent } from "../game/cutIn";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

it.each(["ST1-06", "ST1-09", "ST1-11"])("shows the evolution cut-in for %s by default", async (cardId) => {
  const { areCutInsEnabled } = await import("./cutIn");
  expect(
    cutInFromEvent(
      { kind: "digivolved", seat: 0, permanentId: "p1", cardId, mechanic: "normal" },
      1,
      areCutInsEnabled(),
    ),
  ).toMatchObject({ cardId });
});

it("preserves an explicitly disabled preference", async () => {
  localStorage.setItem("aegis.digivolution-cut-in.enabled", "false");
  const { areCutInsEnabled } = await import("./cutIn");
  expect(areCutInsEnabled()).toBe(false);
});

it("enables evolution cut-ins when storage is unavailable", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage unavailable");
  });
  const { areCutInsEnabled } = await import("./cutIn");
  expect(areCutInsEnabled()).toBe(true);
});
