import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-007.js";

describe("EX11-007 Agumon", () => {
  it("grants both turn-long keywords on play or when moving", () => {
    const compiled = runtimeCompiledCard("EX11-007")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Koromon"], cost: 0, isAlternate: true },
    ]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions).toEqual([
        expect.objectContaining({
          kind: "GainKeyword",
          keyword: { keyword: "Raid", raw: "＜Raid＞" },
          duration: "forTheTurn",
          target: expect.objectContaining({ count: 1 }),
        }),
        expect.objectContaining({
          kind: "GainKeyword",
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "forTheTurn",
          target: expect.objectContaining({ count: 1 }),
        }),
      ]);
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000 })],
      }),
    );
  });
});
