import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-03 Gaogamon", () => {
  it("returns an opposing level 3 Digimon and places the deck top face down under a DATA SQUAD Tamer", () => {
    const compiled = registeredCompiledCards.get("ST24-03") ?? getCompiledCard("ST24-03")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions;
      expect(actions?.[0]).toMatchObject({
        kind: "Return",
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
        to: "hand",
      });
      expect(actions?.[1]).toMatchObject({
        kind: "PlaceUnder",
        fromDeckTop: true,
        optional: true,
        underFilter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] },
      });
    }
  });
});
