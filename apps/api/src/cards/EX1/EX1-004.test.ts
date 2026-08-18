import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-004.js";

describe("EX1-004 Greymon", () => {
  it("plays a Tai Kamiya costing 3 or less on attack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-012", as: "attacker", under: ["EX1-004"] }], hand: [{ card: "ST1-12", as: "tai" }] }, 1: { security: ["BT1-001", "BT1-001"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const taiId = s.inst("tai").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === taiId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play a Tai Kamiya costing more than 3", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-012", as: "attacker", under: ["EX1-004"] }], hand: [{ card: "BT1-085", as: "tai" }] }, 1: { security: ["BT1-001", "BT1-001"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => false, 40);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("tai").instanceId);
  });
});
