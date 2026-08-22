import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-069.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-069 KingSukamon", () => {
  it("plays a level-4 Sukamon on attack and prevents deletion by deleting another Sukamon", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ level: 4, names: ["Sukamon"], cost: 3 }));
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Replacement", event: "wouldBeDeleted" })] });
  });

  it("plays a Sukamon from hand when the host attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-069", as: "king" }], hand: ["BT11-040"] }, 1: { security: ["BT1-001"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("king").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-040"), 3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT11-040")).toBe(true);
  });
});
