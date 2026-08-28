import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-049.js";
describe("EX7-049 Bryweludramon", () => {
  it("De-Digivolves four on play and attack, stopping at level 3", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((e) => e.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "DeDigivolve",
        amount: 4,
        stopAtLevel: 3,
      });
  });
  it("restricts evolution and replaces other departures", () => {
    expect(compiled.effects?.find((e) => e.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "digivolve",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((e) => e.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
    });
  });
});
