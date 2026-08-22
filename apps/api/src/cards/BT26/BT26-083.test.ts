import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-083.js";

describe("BT26-083 compiled fidelity", () => {
  it("registers the security wipe, per-card deletion, recovery, and deletion debuff", () => {
    const card = getCompiledCard("BT26-083");
    expect(card?.coverage).toBe("full");
    expect(card?.keywords?.map(({ keyword }) => keyword)).toEqual(["Rush", "Piercing", "Execute"]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(card?.effects?.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        { kind: "SecurityManipulation", op: "trashTop", leaveCount: 0, trackCount: "trashedSecurity" },
        { kind: "RepeatPerCount", countSource: "trashedSecurity", action: { kind: "Delete" } },
        { kind: "SecurityManipulation", op: "placeFromDeck", amount: 3 },
      ]);
    }
    expect(card?.effects?.find((effect) => effect.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } },
    ]);
    expect(card?.digivolutionRequirement).toEqual([{ level: 6, traits: ["TS"], cost: 4, isAlternate: true }]);
    expect(card?.residual).toContain("Decode gameplay is not implemented by the engine; keyword remains catalog-only.");
  });
});
