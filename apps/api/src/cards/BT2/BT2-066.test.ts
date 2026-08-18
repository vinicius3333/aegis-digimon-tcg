import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-066.js";

describe("BT2-066 Machinedramon", () => {
  it("de-digivolves two opposing Digimon by two cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-066", as: "source" }] }, 1: { battleArea: [
      { card: "BT1-084", as: "targetA", under: ["BT1-010", "BT1-017", "BT1-023"] },
      { card: "BT1-084", as: "targetB", under: ["BT1-029", "BT1-036", "BT1-041"] },
    ] } }, { autoSelectCards: true });
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("targetA").stack.length === 1 && s.perm("targetB").stack.length === 1);
    expect([s.perm("targetA").stack.length, s.perm("targetB").stack.length]).toEqual([1, 1]);
  });

  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-066", as: "machinedramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("machinedramon"), "Blocker")).toBe(true);
  });
});
