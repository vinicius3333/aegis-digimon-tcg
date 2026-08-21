import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-067.js";

describe("BT21-067 Garurumon", () => {
  it("preserves both alternate Digivolution requirements and residual-free coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Gabumon"], cost: 2, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 2, isAlternate: true, level: 3 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("supports security play, ADVENTURE recovery, and inherited draw-trash", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        timing: "endOfBattle",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
      }),
    );
    expect(
      compiled.effects.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "Draw", amount: 1 }),
          expect.objectContaining({ kind: "Trash" }),
        ]),
      }),
    );
  });
});
