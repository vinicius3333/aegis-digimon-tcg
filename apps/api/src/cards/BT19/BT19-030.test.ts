import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-030 Growlmon", () => {
  it("preserves the Rika/Calumon memory gate and inherited Option-use DP reduction", () => {
    const card = runtimeCompiledCard("BT19-030");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourMainPhase",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Rika Nonaka", "Calumon"], match: "name" }],
              },
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
            kind: "SubTrigger",
            event: "whenOptionUsed",
            fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 },
            actions: [
              {
                kind: "ModifyDP",
                amount: -2000,
                duration: "forTheTurn",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              },
            ],
          },
        ],
      },
    ]);
  });
});
