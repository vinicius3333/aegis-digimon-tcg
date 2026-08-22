import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-050.js";

describe("EX11-050 Loudmon", () => {
  it("preserves both evolution requirements, hand cost, DP comparison, and conditional keywords", () => {
    const compiled = runtimeCompiledCard("EX11-050")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, cost: 4, colors: ["Purple", "Red"], isAlternate: true },
      { level: 4, traits: ["Dark Dragon", "Evil Dragon"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({ kind: "Trash", target: { filter: { zone: "hand" }, count: 2 } });
      expect(effect.actions[1]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", relativeToFilter: { nameOrTrait: [{ tokens: ["Dark Dragon", "Evil Dragon"], match: "trait" }] } } } } });
    }
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Scapegoat" } }, while: { kind: "zoneCount", op: "lte", value: 4 } });
    const inherited = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(inherited).toMatchObject({ isInherited: true });
    expect(inherited.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } } });
  });
});
