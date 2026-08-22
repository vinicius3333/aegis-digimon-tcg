import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-079.js";

describe("BT26-079 compiled behavior", () => {
  it("proves evolution, Assembly, Trash Main, keywords, Decode, and the shared delete cost", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      { kind: "SubTrigger", actions: [{ kind: "Trash", target: { untilHandSize: 4 } }, { kind: "Trash", target: { untilHandSize: 4 }, chooser: "opponent" }] },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Plutomon"], cost: 1, isAlternate: true },
      { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([{ reduceCost: 2, materials: [{ names: ["Plutomon"], count: 1 }] }]);
    expect(compiled.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
      expect.objectContaining({ keyword: "Decode" }),
      expect.objectContaining({ keyword: "Retaliation" }),
    ]));
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({ isFromTrash: true, actions: [{ kind: "PlayWithoutCost", from: ["trash"], reduceCostBy: 4, condition: { kind: "handAtMost", value: 5 } }] });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "bt26-079-trash-cost-delete", actions: [{ kind: "Delete", cost: { kind: "trash" }, target: { filter: { levelComparison: { op: "lte", value: 6 } } } }] });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", mode: "instead", actions: [{ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, payCost: false }] });
  });

  it("keeps Q7111's unresolved dynamic hand-trim seam explicit", () => {
    expect(compiled.residual[0]).toContain("dynamic TrashUntilHandSize");
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "opponent", kind: ["Digimon"] } }),
      expect.objectContaining({ kind: "SubTrigger", event: "whenAnyDigivolves", sourceFilter: { controller: "opponent", kind: ["Digimon"] } }),
    ]));
  });
});
