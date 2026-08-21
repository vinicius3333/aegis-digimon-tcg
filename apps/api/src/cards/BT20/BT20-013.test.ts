import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-013.js";

describe("BT20-013 BaoHuckmon", () => {
  it("once per turn optionally plays a qualifying name from hand with a two-cost reduction", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ trigger: "Main", frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Sistermon", "Gankoomon"], match: "name" }] }, count: 1 },
      from: ["hand"],
      payCost: true,
      optional: true,
    });
    expect(main?.actions[1]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2 });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", target: { count: "all" }, amount: 1000, duration: "permanent" }],
    });
  });
});
