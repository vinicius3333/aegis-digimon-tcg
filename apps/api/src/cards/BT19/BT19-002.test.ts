import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-002 Jellymon", () => {
  it("returns this Aqua or Sea Animal to the deck bottom and caps the bounce by its level", () => {
    const card = runtimeCompiledCard("BT19-002");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            cost: {
              kind: "return",
              to: "deckBottom",
              storeAs: "returnedDigimonLevel",
              target: {
                filter: {
                  isSelfRef: true,
                  nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
                },
              },
            },
            actions: [
              {
                kind: "Return",
                to: "hand",
                target: { filter: { controller: "opponent", kind: ["Digimon"], levelLte: "returnedDigimonLevel" } },
              },
            ],
          },
        ],
      },
    ]);
  });
});
