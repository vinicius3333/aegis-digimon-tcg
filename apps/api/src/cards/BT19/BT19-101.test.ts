import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-101 ZeedMillenniummon", () => {
  it("preserves Overclock, trash-to-top cost, conditional immunity, and alternate evolution", () => {
    const card = runtimeCompiledCard("BT19-101");

    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["MoonMillenniummon"], cost: 2, isAlternate: true }],
    });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Overclock" }] },
      ...["OnPlay", "WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Return",
            to: "deckBottom",
            cost: { kind: "return", to: "deckTop" },
            optional: true,
            abortOnDecline: true,
          },
        ],
      })),
      {
        trigger: "AllTurns",
        actions: [
          { kind: "Restrict", restriction: "beSuspended", condition: { kind: "selfHasNoDigivolutionCards" } },
          { kind: "GrantImmunity", immuneFrom: "opponentEffects", condition: { kind: "selfHasNoDigivolutionCards" } },
        ],
      },
    ]);
  });
});
