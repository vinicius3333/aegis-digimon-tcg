import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-083 Rika Nonaka", () => {
  it("preserves dual reveal searches, post-use cost threshold, suspend cost, and Security play", () => {
    const card = runtimeCompiledCard("BT19-083");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [
              {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"], match: "name" }],
                },
                count: 1,
                to: "hand",
              },
              {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }],
                },
                count: 1,
                to: "hand",
              },
            ],
            rest: "deckBottom",
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOptionUsed",
            fireCondition: {
              kind: "triggerOptionCostAtLeast",
              value: 2,
            },
            actions: [
              {
                kind: "GainMemory",
                amount: 1,
                cost: {
                  kind: "suspend",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                },
                optional: true,
                abortOnDecline: true,
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
