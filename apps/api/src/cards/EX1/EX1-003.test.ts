import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-003.js";

describe("EX1-003 Birdramon", () => {
  it("deletes only a 3000 DP-or-less Digimon when attacking a player", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-012", as: "attacker", under: ["EX1-003"] }] }, 1: { battleArea: [{ card: "BT1-009", as: "small", dp: 3000 }, { card: "BT1-010", as: "large", dp: 4000 }], security: ["BT1-001", "BT1-001"] } }, { autoSelectCards: true });
    const smallId = s.perm("small").topCard.instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === smallId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("large").permanentId);
  });
});
