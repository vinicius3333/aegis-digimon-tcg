import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-026.js";

describe("BT13-026 TeslaJellymon", () => {
  it("draws on attack and trashes the opponent's bottom evolution card when inherited", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [expect.objectContaining({ kind: "TrashDigivolution", amount: 1, fromTop: false })] });
  });

  it("draws on attack from its printed effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-026", as: "host" }], deck: ["BT1-001"] }, 1: { security: ["BT1-002"] } });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"), 3000);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("trashes the opponent's bottom evolution card through its inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-026"] }] }, 1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-009", "BT1-010"] }], security: ["BT1-002"] } });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1, 3000);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });
});
