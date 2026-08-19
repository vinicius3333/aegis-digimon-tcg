import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-008.js";

describe("BT23-008 Greymon", () => {
  it("declares Raid", () => {
    expect(compiled.effects[0]?.keywords).toContainEqual({
      keyword: "Raid",
      raw: "＜Raid＞",
    });
  });

  it("once per turn restacks its top card before playing a target for two less", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");

    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions).toHaveLength(1);
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Gabumon", "Nokia Shiramine"], match: "name" }],
        },
        count: 1,
      },
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      cost: {
        kind: "place",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        raw: "By placing this Digimon's top stacked card as its bottom digivolution card",
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
