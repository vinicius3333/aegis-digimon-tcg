import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-224.js";

describe("P-224 Kotone Amano", () => {
  it("places an Xros Heart or Twilight Digimon under this Tamer before the conditional draw", () => {
    const card = runtimeCompiledCard("P-224")!;
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Draw",
            amount: 1,
            condition: { kind: "handSizeAtMost", value: 7 },
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              target: {
                count: 1,
                from: ["hand", "trash"],
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Xros Heart", "Twilight"], match: "trait" }],
                },
              },
            },
          },
        ],
      });
    }
  });

  it("suspends itself to play a level 5 or higher Xros Heart Digimon from under any Tamer at cost -1", () => {
    expect(runtimeCompiledCard("P-224")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["underTamer"],
          payCost: true,
          costOverride: { kind: "reduceCost", amount: 1 },
          cost: { kind: "suspend", target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "underTamer",
              levelComparison: { op: "gte", value: 5 },
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("plays itself without paying the cost in security", () => {
    expect(runtimeCompiledCard("P-224")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });
});
