import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-080.js";

describe("BT18-080 Oboromon", () => {
  it("proves both On Play/When Digivolving clauses, exact color and cost boundaries, and Retaliation", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions).toEqual([
        { kind: "Delete", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], colors: ["Red", "Green", "White", "Purple"], levelComparison: { op: "lte", value: 4 } }, count: 1 } },
        { kind: "Delete", target: { filter: { controllerDefault: "opponent", kind: ["Tamer"], colors: ["Blue", "Yellow", "White", "Black"], playCostLte: 3 }, count: 1 } },
      ]);
    }
    expect(compiled.effects[2]).toMatchObject({ isInherited: true, keywords: [{ keyword: "Retaliation" }] });
  });

  it("executes On Play against the eligible level-4-or-lower Digimon and cost-3-or-lower Tamer", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT18-080", as: "oboromon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "digimon", dp: 2000 }, { card: "BT10-089", as: "tamer" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 7;
    const digimonId = s.perm("digimon").permanentId;
    const tamerId = s.perm("tamer").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("oboromon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === digimonId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === tamerId)).toBe(false);
  });
});
