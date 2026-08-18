import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-049.js";
import "./BT1-054.js";

describe("BT1-049 Labramon", () => {
  it("draws 1 when an opposing Digimon is deleted by having its DP reduced to 0", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-052", as: "host", under: ["BT1-049"] }, { card: "BT1-054", as: "attacker" }], deck: [{ card: "BT1-010", as: "drawn" }] },
      1: { battleArea: [{ card: "BT1-016", as: "target", dp: 2000 }], security: ["BT1-011"] },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
});
