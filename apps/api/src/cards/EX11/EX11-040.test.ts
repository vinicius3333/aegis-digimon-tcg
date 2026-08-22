import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-040.js";

describe("EX11-040 Mulemon", () => {
  it("preserves both evolution requirements and real-link Unchained trigger", () => {
    const compiled = runtimeCompiledCard("EX11-040")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, cost: 2, isAlternate: true },
      { names: ["Maquinamon"], cost: 2, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger, actions: [expect.objectContaining({ kind: "Link", from: ["hand", "digivolutionCards"], payCost: false })] }));
    }
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked.actions).toHaveLength(1);
    expect(linked.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true } });
    expect(linked.actions[0].actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand", "trash"], condition: { kind: "permanentCount", op: "lte", value: 1 } });
  });
});
