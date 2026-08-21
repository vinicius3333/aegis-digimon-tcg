import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-100.js";

describe("BT18-100 Gospel of the Fallen Angel", () => {
  it("covers the breeding digivolution, Delay, and Security placement clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlaceInBattleAreaSelf" }],
      }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          optional: true,
          from: ["trash"],
          payCost: false,
          target: { filter: { zone: "breedingArea", controller: "mine" } },
          into: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses Q3052's placed-Option boundary and the printed reduced-cost payment", () => {
    const delay = compiled.effects.find((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Trash",
          target: { filter: { controller: "opponent", kind: ["Option"], placedByPlaceInBattleAreaEffect: true } },
          cost: {
            kind: "digivolve",
            from: ["trash"],
            costReduction: 3,
            into: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
          },
        },
      ],
    });
  });
});
