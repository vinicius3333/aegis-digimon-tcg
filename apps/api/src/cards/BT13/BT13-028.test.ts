import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-028.js";

describe("BT13-028 Thetismon", () => {
  it("uses the hand digivolution cost 3 and the three-card inherited return cost", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Main", isFromHand: true, actions: [expect.objectContaining({ kind: "Digivolve", payCost: true, costOverride: 3, ignoreRequirements: true, additionalCosts: [expect.objectContaining({ kind: "place", position: "bottom" })] })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: expect.objectContaining({ kind: "return", target: expect.objectContaining({ count: 3 }) }) })] });
  });

  it("returns three Jellymon-text cards from trash to unsuspend after attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-015", as: "host", under: ["BT13-028"] }], trash: ["BT13-028", "BT13-028", "BT13-028"] }, 1: { security: ["BT1-002"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended, 3000);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT13-028")).toHaveLength(0);
  });
});
