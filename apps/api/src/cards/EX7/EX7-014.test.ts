import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-014.js";
describe("EX7-014 Metallicdramon", () => {
  it("deletes the lowest-DP opponent on play and attack", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((e) => e.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", superlative: "lowestDP" }, count: 1 },
      });
  });
  it("restricts small opposing Digimon and replaces other-than-effect departure", () => {
    expect(compiled.effects?.find((e) => e.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "RestrictPlay",
      seat: "opponent",
      filter: { kind: ["Digimon"], dpAtMost: 6000 },
      mode: "playOrMove",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((e) => e.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
    });
  });
});
