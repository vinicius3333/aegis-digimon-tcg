import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-066.js";

describe("BT21-066 Arresterdramon", () => {
  it("preserves both alternate Digivolution requirements, DigiXros, and complete coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, texts: ["Save"], cost: 2, isAlternate: true },
      { level: 3, traits: ["Hero"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ desc: "1 Digimon card with ＜Save＞ in text" }], count: 2 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("plays Hunter/Hero Tamers and saves a qualifying Digimon", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"] })],
      }),
    );
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "WhenDigivolving" }));
    const deletion = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    const saveAction = deletion?.actions[0] as { target?: { orFilters?: Array<{ keywords?: string[] }> } };
    expect(saveAction.target?.orFilters).toEqual(
      expect.arrayContaining([expect.objectContaining({ keywords: ["Save"] })]),
    );
    expect(saveAction.target).toMatchObject({
      filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] },
      orFilters: [{ controller: "mine", kind: ["Digimon"], keywords: ["Save"] }],
      count: 1,
      from: ["hand", "trash"],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", target: expect.anything(), amount: 2000, duration: "permanent" }],
      }),
    );
  });
});
