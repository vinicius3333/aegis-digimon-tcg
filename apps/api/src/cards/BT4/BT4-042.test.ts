import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-042.js";

describe("BT4-042 Piddomon", () => {
  it("has Blocker and loses 2 memory when it attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-042", as: "piddo" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("piddo"), "Blocker")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("piddo").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
