import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-075.js";

describe("BT23-075 Eater EDEN", () => {
  it("raises the return ceiling for Mother Eater cards in the breeding area", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({ kind: "Return", to: "deckBottom", target: { count: 1 } });
      expect(action.playCostCeiling).toMatchObject({
        base: 6,
        raise: 1,
        per: 1,
        unit: "digivolutionCardsOfFiltered",
        filter: { zone: "breeding", nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }] },
      });
    }
  });

  it("limits the leave replacement and end-of-opponent-turn deletion correctly", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
    });
    const end = compiled.effects.find((entry) => entry.trigger === "EndOfOpponentsTurn") as any;
    expect(end.frequency).toBe("OncePerTurn");
    expect(end.actions[0].target.filter.superlative).toBe("lowestPlayCost");
  });
});
