import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-049.js";

describe("EX11-049 Punkmon", () => {
  it("preserves both evolution requirements and trash-to-trash digivolution flow", () => {
    const compiled = runtimeCompiledCard("EX11-049")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, cost: 3, colors: ["Purple", "Red"], isAlternate: true },
      { level: 3, traits: ["Evil"], cost: 2, isAlternate: true },
    ]);
    const attack = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attack.actions[0]).toMatchObject({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } });
    expect(attack.actions[1]).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 2, optional: true, into: { nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }] } });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "YourTurn", isInherited: true, actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000 })] }));
  });
});
