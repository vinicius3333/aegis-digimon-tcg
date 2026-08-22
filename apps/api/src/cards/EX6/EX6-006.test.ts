import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-006.js";

describe("EX6-006 Gate of Deadly Sins", () => {
  it("in breeding places an egg-deck card under itself, deletes your battle-area Digimon, and places under a Seven Great Demon Lords if deletion occurred", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({
      isBreeding: true,
      actions: [
        { kind: "PlaceUnder", fromEggDeck: true, target: { isSelf: true, filter: { isSelfRef: true } } },
        { kind: "Delete", target: { count: "all", filter: { controller: "mine", kind: ["Digimon"] } } },
        {
          kind: "PlaceUnder",
          from: ["trash"],
          underFilter: { isSelfRef: true },
          condition: { kind: "ifThisEffectActed" },
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [{ match: "trait", tokens: ["Seven Great Demon Lords"] }],
            },
          },
        },
      ],
    });
  });
  it("offers distinct-name gated Ogudomon revival and mutually exclusive inherited cost reductions", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      isBreeding: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          condition: { kind: "selfDigivolutionStackDistinctNameCount", value: 7 },
          target: { count: 1, filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Ogudomon"] }] } },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Seven Great Demon Lords"] }],
          },
          amountChoices: [{ amount: 3 }, { amount: 4, condition: { value: 5 } }],
        },
      ],
    });
  });
});
