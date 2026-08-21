import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-026.js";

describe("EX10-026 SkullKnightmon", () => {
  it("proves the Knightmon-text evolution, hand-trash costs, Save, and inherited Blocker", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, texts: ["Knightmon"], cost: 2, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{
        kind: "Delete", optional: true, abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      }] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({ keywords: [{ keyword: "Save" }] });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ keywords: [{ keyword: "Blocker" }] });
  });
});
