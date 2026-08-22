import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-033.js";

describe("EX10-033 Pyramidimon", () => {
  it("proves Fragment, shared once-per-turn placement, and scaled play-cost reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fragment", amount: 3 }],
    });

    const placeEffects = compiled.effects?.filter((effect) => effect.actions?.[0]?.kind === "PlaceUnder");
    expect(placeEffects).toHaveLength(2);
    expect(placeEffects?.map((effect) => [effect.trigger, effect.frequency, effect.sharedUseKey])).toEqual([
      ["WhenDigivolving", "OncePerTurn", "ir-shared-0"],
      ["WhenAttacking", "OncePerTurn", "ir-shared-0"],
    ]);
    for (const effect of placeEffects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "PlaceUnder",
        target: { filter: { zone: "trash", controller: "mine" }, count: 3, upTo: true, from: ["trash"] },
      });
      expect(effect.optional).toBe(true);
    }

    const reductions = compiled.effects?.filter((effect) => effect.actions?.[0]?.kind === "CostModifier");
    expect(reductions).toHaveLength(2);
    for (const effect of reductions ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "CostModifier",
        mode: "reduce",
        costType: "play",
        amount: 2,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        cost: { kind: "trash", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 3, upTo: true } },
        scaling: { per: 1, unit: "cards" },
        abortOnDecline: true,
      });
    }
  });
});
