import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-09 Sunflowmon", () => {
  it("may suspend an opposing Digimon or Tamer, then places the deck top face down under a DATA SQUAD Tamer", () => {
    const compiled = registeredCompiledCards.get("ST24-09") ?? getCompiledCard("ST24-09")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)?.actions;
      expect(actions?.[0]).toMatchObject({ kind: "Suspend", optional: true, target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } });
      expect(actions?.[1]).toMatchObject({ kind: "PlaceUnder", fromDeckTop: true, optional: true, underFilter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }] } });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 1000, duration: "permanent" });
  });
});
