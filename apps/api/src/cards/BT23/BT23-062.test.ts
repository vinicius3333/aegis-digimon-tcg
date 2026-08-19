import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-062.js";

describe("BT23-062 Dracmon", () => {
  it("gains 1 memory by trashing a matching card from hand, without an optional decline", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions[0];
    expect(action).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Undead", "Dark Animal", "CS"], match: "trait" }],
          },
          count: 1,
        },
      },
      abortOnDecline: true,
    });
    expect(action.optional).toBeUndefined();
  });

  it("has an inherited once-per-turn trash digivolution into an Undead or Dark Animal Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          optional: true,
          into: { nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] },
        },
      ],
    });
  });

  it("requires a level 2 CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
  });
});
