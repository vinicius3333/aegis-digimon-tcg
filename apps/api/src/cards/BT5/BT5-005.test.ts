import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-005.js";

describe("BT5-005 Tsumemon", () => {
  it("draws once when its Unidentified host attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-059", as: "host", under: ["BT5-005"] }], deck: ["BT1-009"] }, 1: { security: ["BT1-010"] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
