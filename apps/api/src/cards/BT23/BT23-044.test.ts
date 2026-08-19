import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-044.js";

describe("BT23-044 Lilamon", () => {
  it("reduces its play cost when the required Yuuko or CS condition is present", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Yuuko Kamishiro"], match: "name" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
          },
        },
      ],
    });
  });

  it("restricts one of your eligible Digimon from returning to hand or deck after paying the suspend cost", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Restrict",
        target: {
          filter: {
            controller: "mine",
            or: [{ trait: "Vegetation" }, { trait: "Plant" }, { trait: "Fairy" }, { trait: "CS" }],
          },
          count: 1,
        },
        restriction: "cannotReturnToHandOrDeck",
        duration: "untilOpponentTurnEnd",
        cost: { kind: "suspend", target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("has no unprinted inherited effect", () => {
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
