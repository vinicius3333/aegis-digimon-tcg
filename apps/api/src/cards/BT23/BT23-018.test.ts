import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-018.js";

describe("BT23-018 Garurumon", () => {
  it("declares Jamming", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Jamming", raw: "＜Jamming＞" }]);
  });

  it("once per turn pays the restack cost before playing Agumon or Nokia for two less", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Agumon", "Nokia Shiramine"], match: "name" }] },
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
