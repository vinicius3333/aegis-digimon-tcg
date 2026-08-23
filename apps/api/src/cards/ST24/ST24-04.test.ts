import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-04 Agumon", () => {
  it("reveals 3, adds and places DATA SQUAD cards, and returns the rest to deck bottom", () => {
    const compiled = registeredCompiledCards.get("ST24-04") ?? getCompiledCard("ST24-04")!;
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [
          { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] } },
          {
            count: 1,
            to: "placeUnder",
            faceDown: true,
            underFilter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
          },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    });
  });
});
