import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-032.js";

describe("EX11-032 GrandGalemon", () => {
  it("preserves the standard evolution and hand, digivolving, and inherited effects", () => {
    const compiled = runtimeCompiledCard("EX11-032")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, cost: 3, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Main", isFromHand: true, actions: [expect.objectContaining({ kind: "Digivolve", costOverride: 3, ignoreRequirements: true, cost: expect.objectContaining({ kind: "place", position: "bottom" }) })] }));
    const digivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")!;
    expect(digivolving.actions[0]).toMatchObject({ kind: "Suspend", target: { filter: { controllerDefault: "any", kind: ["Digimon"] } } });
    expect(digivolving.actions[1]).toMatchObject({ kind: "PlayWithoutCost", dpCeilingModifier: { mode: "raiseCeiling", amount: 1000 } });
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenBattleWon" })] }));
  });
});
