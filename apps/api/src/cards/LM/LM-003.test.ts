import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-003.js";

describe("LM-003 TeslaJellymon", () => {
  it("trashes a blue card to survive a losing battle for the turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "LM-003", as: "attacker", dp: 4000 }], hand: [{ card: "BT1-029", as: "blueCost" }] },
      1: { battleArea: [{ card: "BT1-010", as: "defender", dp: 5000, suspended: true }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("defender").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blueCost").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId)).toBe(true);
  });

  it("draws from the inherited effect at seven cards, but not at eight", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "LM-003", as: "host", dp: 4000 }], hand: ["BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029", "BT1-029"] }, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const host = s.perm("host");
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 8);
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });
});
