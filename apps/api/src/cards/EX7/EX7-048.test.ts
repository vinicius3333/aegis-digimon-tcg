import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-048.js";

describe("EX7-048", () => {
  it("reveals 6 and may use a Three Musketeers Option without paying its cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealAdd",
        revealCount: 6,
        add: [{ count: 1, to: "useOption", payCost: false, optional: true }],
        rest: "deckTopOrBottom",
      });
  });
  it("prevents a Three Musketeers Digimon from leaving play by trashing an Option in its digivolution cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      mode: "prevent",
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: {
            zone: "digivolutionCards",
            kind: ["Option"],
            hostFilter: { isSelfRef: true },
          },
        },
      },
    }));
});
