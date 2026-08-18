import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-008.js";

describe("EX2-008 Guilmon", () => {
  it("adds a Growlmon/Gallantmon and Takato from the top four on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX2-008", as: "guilmon" }], deck: [{ card: "EX2-009", as: "growlmon" }, { card: "EX2-056", as: "takato" }, "BT1-001", "BT1-002"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("growlmon").instanceId, s.inst("takato").instanceId]));
  });

  it("deletes a 3000 DP target when inherited by a Growlmon-family host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-009", under: ["EX2-008"], as: "attacker" }] },
      1: { battleArea: [{ card: "EX2-031", dp: 3000, as: "target" }], security: ["BT1-001"] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
