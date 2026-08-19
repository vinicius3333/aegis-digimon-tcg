import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-001.js";

describe("BT22-001 Puyoyomon", () => {
  it("draws only once per turn when an effect adds an Aqua/Sea Animal card to this stack", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    const trigger = effect?.actions[0] as any;
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }] },
    });
    expect(trigger.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }]);
  });
});
