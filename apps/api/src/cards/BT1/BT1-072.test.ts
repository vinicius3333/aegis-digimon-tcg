import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-072.js";

describe("BT1-072 Woodmon", () => {
  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-072", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Blocker")).toBe(true);
  });

  it("loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-072", as: "attacker" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
