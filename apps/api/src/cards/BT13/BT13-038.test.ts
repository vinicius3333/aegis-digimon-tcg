import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-038.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-038 Reppamon", () => {
  it("trashes the top security card for Security Attack -2", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -2 }, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "security", position: "top" } } } });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
  });

  it("pays the attack cost by trashing the controller's top security card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-038", as: "reppa" }], security: ["BT1-001"] }, 1: { security: ["BT1-002"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("reppa").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0, 3000);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
