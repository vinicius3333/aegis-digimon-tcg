import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-010.js";

describe("EX12-010 Greymon", () => {
  it("returns the matching Digimon card from trash in both windows", () => {
    const card = registeredCompiledCards.get("EX12-010")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(card.effects.find((e) => e.trigger === trigger)!.actions[0]).toMatchObject({
        kind: "Return", target: { filter: { zone: "trash" }, to: "hand" },
      });
    }
  });
});
