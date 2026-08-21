import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-056.js";

describe("BT17-056 Locomon", () => {
  it("once per turn reveals three after an attack target switch and places the eligible card underneath", () => {
    const effect = compiled.effects.find((entry) => entry.frequency === "OncePerTurn");
    expect(effect).toMatchObject({
      trigger: "AllTurns",
      actions: [{ event: "whenAttackTargetSwitched", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "trash", add: [{ count: 1, to: "placeUnder", orFilters: [{ colors: ["Black"], levelComparison: { op: "lte", value: 5 } }] }] }] }],
    });
  });

  it("may digivolve into GroundLocomon for free when its effect adds a source", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.frequency === undefined);
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true, into: { nameOrTrait: [{ tokens: ["GroundLocomon"], match: "name" }] } }],
    });
  });
});
