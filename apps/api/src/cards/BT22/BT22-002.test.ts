import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-002.js";

describe("BT22-002 Kyaromon", () => {
  it("draws once per turn when another Puppet Digimon or Token is deleted", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    const trigger = effect?.actions[0] as any;
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: {
        controller: "mine",
        excludeSelf: true,
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }],
        includeToken: true,
      },
    });
    expect(trigger.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }]);
  });
});
