import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-050.js";

describe("EX12-050 SymbareAngoramon", () => {
  it("offers the once-per-turn reduced-cost play/use choice", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toMatchObject([{
      kind: "Modal",
      choose: 1,
      options: [
        [{ kind: "PlayWithoutCost", payCost: true, reduceCostBy: 2, optional: true }],
        [{ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2, optional: true }],
      ],
    }]);
  });

  it("retains the Angoramon/NSp evolution routes and inherited DP", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Angoramon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["NSp"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 1000, duration: "permanent" },
    ]);
  });
});
