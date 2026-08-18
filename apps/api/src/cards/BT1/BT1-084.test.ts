import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-084.js";

describe("BT1-084 Omnimon", () => {
  it("deletes every opposing Digimon sharing the chosen name when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT1-084", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-010" }, { card: "BT1-010" }, { card: "BT1-011", as: "different" }] } }, { autoSelectCards: true });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("different").permanentId);
  });

  it("may return a level 6 digivolution card to hand to unsuspend when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-084", as: "attacker", under: [{ card: "BT1-025", as: "level6" }] }] }, 1: { security: ["BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("level6").instanceId) && !s.perm("attacker").isSuspended);
    expect(s.perm("attacker").stack).toHaveLength(0);
  });
});
