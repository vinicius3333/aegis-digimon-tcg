// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshModule() {
  vi.resetModules();
  return import("./battleLanes");
}

describe("battle lane preference", () => {
  beforeEach(() => localStorage.clear());

  it("draws two lanes by default", async () => {
    const { getBattleLanes, BattleLanes } = await freshModule();
    expect(getBattleLanes()).toBe(BattleLanes.Two);
  });

  it("persists the player's choice across a reload", async () => {
    const first = await freshModule();
    first.setBattleLanes(first.BattleLanes.One);
    expect(localStorage.getItem("aegis.battle-lanes")).toBe("one");

    const reloaded = await freshModule();
    expect(reloaded.getBattleLanes()).toBe(reloaded.BattleLanes.One);
  });

  it("ignores an unknown stored value", async () => {
    localStorage.setItem("aegis.battle-lanes", "three");
    const { getBattleLanes, BattleLanes } = await freshModule();
    expect(getBattleLanes()).toBe(BattleLanes.Two);
  });

  it("draws one lane on a phone without changing the saved choice", async () => {
    const { BattleLanes, getBattleLanes, resolveBattleLanes } = await freshModule();
    expect(resolveBattleLanes(BattleLanes.Two, true)).toBe(BattleLanes.One);
    expect(resolveBattleLanes(BattleLanes.One, true)).toBe(BattleLanes.One);
    expect(resolveBattleLanes(BattleLanes.Two, false)).toBe(BattleLanes.Two);
    expect(resolveBattleLanes(BattleLanes.One, false)).toBe(BattleLanes.One);
    expect(getBattleLanes()).toBe(BattleLanes.Two);
  });
});
