import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-029.js";

describe("EX11-029 Turbomon", () => {
  it("preserves both evolution requirements, link sources, and linked Unchained trigger", () => {
    const compiled = runtimeCompiledCard("EX11-029")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, cost: 2, isAlternate: true },
      { names: ["Maquinamon"], cost: 2, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(expect.objectContaining({
        trigger,
        actions: [expect.objectContaining({
          kind: "Link",
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Maquinamon"], match: "name" }] }, count: 1 },
          recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
        })],
      }));
    }
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked" }] });
    expect(linked.actions[0]).toMatchObject({ actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false }] });
  });
});
