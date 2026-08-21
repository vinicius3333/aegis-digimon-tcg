import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-017.js";

describe("BT18-017 AncientVolcanomon", () => {
  it("deletes every opposing Digimon tied for the lowest DP on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", target: { count: "all", filter: { controller: "opponent", superlative: "lowestDP" } } }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "Replacement" }] });
    const s = setupEngine({ 0: { hand: [{ card: "BT18-017", as: "ancient" }] }, 1: { battleArea: [{ card: "BT1-030", dp: 2000, as: "lowA" }, { card: "BT1-030", dp: 2000, as: "lowB" }, { card: "BT1-030", dp: 3000, as: "high" }] } }, { autoSelectCards: true });
    s.state.memory = 20;
    const lowA = s.perm("lowA").permanentId;
    const lowB = s.perm("lowB").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-030");
    expect([lowA, lowB]).not.toContain(s.state.players[1]!.battleArea[0]!.permanentId);
  });
});
