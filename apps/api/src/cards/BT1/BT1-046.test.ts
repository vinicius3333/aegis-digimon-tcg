import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-046.js";

describe("BT1-046 Kudamon", () => {
  it("draws 1 when attacking with 4 or fewer cards in hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-046", as: "attacker" }], deck: [{ card: "BT1-010", as: "drawn" }] }, 1: { security: ["BT1-011"] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
