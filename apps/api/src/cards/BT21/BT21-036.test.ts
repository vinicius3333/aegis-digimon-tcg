import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-036.js";

describe("BT21-036 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves Blocker and Armor Purge", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
    );
  });

  it("unsuspends itself and reduces one opposing Digimon by 2000 per Armor Form card in trash", () => {
    const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      {
        kind: "Unsuspend",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      },
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -2000,
        duration: "forTheTurn",
        scaling: {
          per: 1,
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }],
          },
          unit: "trash",
        },
      },
    ]);
  });

  it("preserves both alternate Digivolution requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Veemon"], cost: 3, isAlternate: true },
      { level: 3, traits: ["Hero"], cost: 3, isAlternate: true },
    ]);
  });
});
