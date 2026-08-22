import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-044.js";

describe("EX11-044 Pyramidimon", () => {
  it("preserves evolution, exact three-card trash cost, and bottom-stack recovery", () => {
    const compiled = runtimeCompiledCard("EX11-044")!;
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, cost: 3, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ex11-044-main-effect" });
      expect(effect.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { superlative: "highestPlayCost", kind: ["Digimon", "Tamer"] } }, cost: { kind: "trash", target: { from: ["digivolutionCards"], count: 3 } } });
    }
    const recovery = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(recovery.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenDigivolutionTrashed" });
    expect(recovery.actions[0].actions[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom" });
    expect(recovery.actions[0].actions[0].target).toMatchObject({ from: ["trash"], count: 3, upTo: true });
  });
});
