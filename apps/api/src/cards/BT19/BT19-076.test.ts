import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-076 Luminamon", () => {
  it("preserves Shademon evolution, trait-filtered reveal recovery, free Tamer play, and Save", () => {
    const card = runtimeCompiledCard("BT19-076");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digivolutionRequirement).toEqual([
      { names: ["Shademon"], cost: 2, isAlternate: true },
    ]);
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [{
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare", "Twilight"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            }],
            rest: "deckBottom",
          },
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", kind: ["Tamer"], playCostLte: 4 },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            optional: true,
          },
        ],
      },
      {
        trigger: "OnDeletion",
        actions: [],
        keywords: [{ keyword: "Save", raw: "＜Save＞" }],
      },
    ]);
  });
});
