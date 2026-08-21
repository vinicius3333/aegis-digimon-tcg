import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-030.js";

describe("BT13-030 UlforceVeedramon", () => {
  it("trashes two cards per Royal Knight or blue Tamer and returns only empty-stack Digimon", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find(candidate => candidate.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, fromTop: true, scaling: { per: 1, unit: "cards" } });
    }
    expect(compiled.effects[2]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed", actions: [expect.objectContaining({ kind: "Return", to: "hand" })] })] });
  });

  it("trashes two opponent evolution cards per qualifying Royal Knight on play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-040", as: "magnamon" }], hand: [{ card: "BT13-030", as: "ulforce" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-009", "BT1-010"] }], security: ["BT1-002"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ulforce").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0, 3000);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });
});
