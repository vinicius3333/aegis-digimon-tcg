import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-093.js";

describe("BT16-093", () => {
  it("waives color requirements when you have a green Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }],
    });
  });

  it("digivolves into Rapidmon from hand and prevents DP reduction", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
          bindResultAs: "bt16093Rapidmon",
        },
        {
          kind: "Restrict",
          restriction: "dpImmune",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          target: { filter: { boundRef: "bt16093Rapidmon" } },
        },
      ],
    });
  });

  it("plays Terriermon from hand/trash and returns itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    });
  });
});
