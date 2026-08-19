import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-043.js";

describe("BT23-043 CannonBeemon", () => {
  it("grants Blocker to all of your Royal Base Digimon in Security", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn") as any;
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          keyword: { keyword: "Blocker" },
        },
      ],
    });
  });

  it("prevents this Digimon from leaving except by its owner's effects", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      leaveCause: "otherThanYourEffect",
      actions: [
        {
          kind: "Prevent",
          mode: "leavePlay",
          cost: {
            kind: "flipSecurity",
            target: {
              filter: { zone: "security", controller: "mine", position: "top", faceUp: true },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(effect.frequency).toBe("OncePerTurn");
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
