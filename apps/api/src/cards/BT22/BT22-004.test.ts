import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-004.js";

describe("BT22-004 Wanyamon", () => {
  it("digivolves this Digimon only when an effect adds a CS card to its stack", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    const trigger = effect?.actions[0] as any;
    expect(trigger).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
    });
    expect(trigger.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      into: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
      from: ["hand"],
      reduceCost: 1,
      optional: true,
    });
  });
});
