import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-091 Trinity Burst!", () => {
  it("preserves level-gated color waiver, distinct token gates, double Alliance attack, and Security play", () => {
    const card = runtimeCompiledCard("BT19-091");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                levels: [5],
                nameOrTrait: [{ tokens: ["WarGrowlmon", "Taomon", "Rapidmon"], match: "name" }],
              },
            },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          ...["WarGrowlmon", "Taomon", "Rapidmon"].map((token) => ({
            kind: "PlayToken",
            tokens: [token],
            count: 1,
            payCost: false,
            condition: {
              kind: "not",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: [token], match: "nameExact" }],
                },
              },
            },
          })),
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"], levels: [5], excludeToken: true }, count: 1 },
            keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
            count: 2,
            duration: "forTheTurn",
          },
          {
            kind: "Attack",
            target: { filter: { controller: "mine", kind: ["Digimon"], levels: [5], excludeToken: true }, count: 1 },
            mandatory: true,
            sameTarget: true,
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                levels: [5],
                nameOrTrait: [{ tokens: ["WarGrowlmon", "Taomon", "Rapidmon"], match: "name" }],
              },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            optional: true,
          },
        ],
      },
    ]);
  });
});
