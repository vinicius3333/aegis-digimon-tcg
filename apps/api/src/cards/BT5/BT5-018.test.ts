import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-018.js";

describe("BT5-018 Dorbickmon", () => {
  it("adds the trashed red Digimon's DP for the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-018", as: "dorbickmon" }], hand: ["AD1-001"] }, 1: { security: ["BT1-010"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("dorbickmon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1 && s.perm("dorbickmon").currentDP === 16000);
    expect(s.state.players[0]!.trash[0]!.cardId).toBe("AD1-001");
    expect(s.perm("dorbickmon").currentDP).toBe(16000);
  });
});
