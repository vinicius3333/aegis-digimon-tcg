import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-005.js";

describe("BT22-005 Tsumemon", () => {
  it("draws once per turn when an owned Unidentified/CS Digimon is played", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    const trigger = effect?.actions[0] as any;
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Unidentified", "CS"], match: "trait" }],
      },
    });
    expect(trigger.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }]);
  });
});
