import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-082 Yao Qinglan", () => {
  it("preserves conditional memory setting, attacking-trait placement, and Security play", () => {
    const card = runtimeCompiledCard("BT19-082");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "StartOfYourTurn",
        actions: [
          {
            kind: "SetMemory",
            value: 3,
            condition: { kind: "memoryAtMost", value: 2 },
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenAttacking",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
            },
            actions: [
              {
                kind: "PlaceUnder",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 5 },
                    nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
                  },
                  from: ["hand"],
                  count: 1,
                },
                underFilter: { controller: "mine", kind: ["Digimon"], isTriggerSource: true },
                position: "bottom",
                cost: {
                  kind: "suspend",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                },
                optional: true,
              },
            ],
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            payCost: false,
          },
        ],
      },
    ]);
  });
});
