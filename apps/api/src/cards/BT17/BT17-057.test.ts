import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-057.js";

describe("BT17-057 Chaosdramon", () => {
  it("deletes opposing Digimon up to a total play-cost budget of seven", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "DeleteBudget",
        filter: { controller: "opponent", kind: ["Digimon"] },
        budget: 7,
        upTo: true,
      });
    }
  });

  it("only prevents leaving caused by an opponent's effect", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "byOpponentEffect",
      actions: [{ kind: "Prevent", cost: { kind: "trash", target: { count: 2 } }, optional: true }],
    });
  });
});
