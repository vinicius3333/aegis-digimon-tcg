import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-091 Trinity Burst!", () => {
  it("plays the three distinct tokens through a public Option play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-091", as: "option" }], battleArea: [{ card: "BT19-011", as: "attacker" }] },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length >= 3);
    const tokenIds = s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId);
    expect(tokenIds).toEqual(expect.arrayContaining(["TOKEN-Taomon-Token", "TOKEN-Rapidmon-Token"]));
    expect(tokenIds).not.toContain("TOKEN-WarGrowlmon-Token");
  });

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
            tokens: [`${token} Token`],
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
