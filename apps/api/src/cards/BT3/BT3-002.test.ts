import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-016.js";
import "./BT3-002.js";

describe("BT3-002 DemiVeemon", () => {
  it("draws 1 when its host with Jamming attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-016", as: "host", under: ["BT3-002"] }], deck: [{ card: "BT1-010", as: "drawn" }] }, 1: { security: ["BT1-011"] } });

    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId), 5000);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
