import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-102.js";
import "../index.js";

describe("BT26-102 compiled fidelity", () => {
  it("keeps the Seven Code waiver and complete Security clause while exposing the mixed placement seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
        },
        { kind: "AddToHandSelf" },
      ],
    });
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        mixedSources: { battleAreaPermanents: true, linkedCards: true, trash: true },
        trackCount: "sevenCodeMaterials",
      },
      {
        kind: "Digivolve",
        ignoreRequirements: true,
        payCost: false,
        condition: { kind: "namedCountAtLeast", countSource: "sevenCodeMaterials", count: 6 },
      },
    ]);
  });
});
