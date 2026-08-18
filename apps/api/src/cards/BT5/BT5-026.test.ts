import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-026.js";

describe("BT5-026 Coelamon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-026", as: "coelamon" }] }, 1: { security: ["BT1-009"] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("coelamon"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("coelamon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === -2);
    expect(s.state.memory).toBe(-2);
  });
});
