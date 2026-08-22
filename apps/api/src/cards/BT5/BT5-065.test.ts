import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-065.js";

describe("BT5-065 Shademon", () => {
  it("plays itself after its security battle", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-065", as: "shade" }] }, 1: { battleArea: [{ card: "BT4-073", as: "attacker" }] } });
    s.state.turnSeat = 1;
    const shadeId = s.inst("shade").instanceId;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shadeId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shadeId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("has Blocker and can't attack on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-065", as: "shade" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("shade"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("shade"), "attack")).toBe(true);
  });
});
