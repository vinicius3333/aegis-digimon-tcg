import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-072.js";
describe("BT21-072 Arresterdramon Superior Mode", () => {
  it("has Raid/Piercing, optional unsuspended attack, stack scaling, and inherited DP", () => {
    expect(compiled.effects.filter((e) => e.keywords?.length)).toHaveLength(2);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [expect.objectContaining({ kind: "Attack", withoutSuspending: true })],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        actions: [
          expect.objectContaining({
            kind: "ModifyDP",
            scaling: expect.objectContaining({ unit: "digivolutionCards" }),
          }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
      }),
    );
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, texts: ["Save"], cost: 3, isAlternate: true },
      { traits: ["Hero"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
