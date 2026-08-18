import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-009.js";

describe("BT7-009 Huckmon", () => {
  it("adds all revealed Sistermon cards to hand when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT7-009"], as: "host" }], deck: [{ card: "BT6-082", as: "sister1" }, { card: "BT6-084", as: "sister2" }, "BT1-010", "BT1-011", "BT1-012"] }, 1: { security: ["BT1-101"] } }, { autoSelectCards: true });

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("sister1").instanceId, s.inst("sister2").instanceId]));
  });
});
