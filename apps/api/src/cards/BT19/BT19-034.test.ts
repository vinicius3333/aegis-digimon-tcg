import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-034 Growlmon", () => {
  it("preserves the one-or-fewer-Tamers Rika play gate and inherited opponent DP reduction", () => {
    const card = runtimeCompiledCard("BT19-034");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Rika Nonaka"], match: "name" }] } },
            condition: {
              kind: "permanentCount",
              op: "lte",
              value: 1,
              filter: { controllerDefault: "mine", kind: ["Tamer"] },
            },
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "ModifyDP",
            amount: -2000,
            duration: "forTheTurn",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
        ],
      },
    ]);
  });
});
