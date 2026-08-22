import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-017 Jellymon", () => {
  it("reveals three cards for Aqua/Sea Animal and LIBERATOR additions, then bottoms the rest", () => {
    const card = runtimeCompiledCard("BT19-017");
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
                  nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
                },
                count: 1,
                to: "hand",
              },
              {
                filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
                count: 1,
                to: "hand",
              },
            ],
            rest: "deckBottom",
          },
        ],
      },
      {
        trigger: "EndOfAttack",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "GainMemory", amount: 1 }],
      },
    ]);
  });
});
