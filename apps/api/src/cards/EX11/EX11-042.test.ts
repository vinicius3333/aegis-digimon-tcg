import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-042.js";

describe("EX11-042 MockingBirdmon", () => {
  it("preserves both evolution requirements and linked deletion/redirect effects", () => {
    const compiled = runtimeCompiledCard("EX11-042")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, cost: 3, isAlternate: true },
      { level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true },
    ]);
    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(linked).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 } }] }] });
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack" }] }] });
  });
});
