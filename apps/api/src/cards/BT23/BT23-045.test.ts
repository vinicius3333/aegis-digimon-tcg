import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-045.js";

describe("BT23-045 TigerVespamon ACE", () => {
  it("declares Blast Digivolve from hand", () => {
    const counter = compiled.effects.find((entry) => entry.trigger === "Counter") as any;
    expect(counter).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("requires placing a Royal Base or Zaxon Digimon in security before returning an eligible opponent Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Return",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
          count: 1,
        },
        to: "hand",
        cost: {
          kind: "place",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base", "Zaxon"], match: "trait" }],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          destination: "security",
          position: "bottom",
          faceDown: false,
        },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("only reacts when this Digimon suspends and pays by flipping the top face-up security card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const subtrigger = effect.actions[0];
    expect(subtrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
    });
    expect(subtrigger.actions[0]).toMatchObject({
      kind: "Unsuspend",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      cost: {
        kind: "flipSecurity",
        target: {
          filter: { zone: "security", controller: "mine", position: "top", faceUp: true },
          count: 1,
        },
        raw: "by flipping your top face-up security card face down",
      },
      optional: true,
      abortOnDecline: true,
    });
  });
});
