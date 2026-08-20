import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-076.js";

describe("EX12-076 Susanoomon", () => {
  it("preserves the printed evolution and Assembly requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, traits: ["Hybrid", "Shambala", "TS"], cost: 5, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      {
        materials: [{ count: 8, traits: ["Hybrid", "Shambala"], differentNames: true }],
        reduceCost: 9,
      },
    ]);
  });

  it("trashes the opponent's top security and recovers only after the four-color condition", () => {
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attacking.frequency).toBe("OncePerTurn");
    expect(attacking.actions[0]).toMatchObject({
      kind: "SecurityManipulation", op: "placeAsSecurity", controller: "opponent",
    });
    expect(attacking.actions.slice(1)).toMatchObject([
      {
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        condition: { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 4 },
      },
      {
        kind: "GainKeyword",
        keyword: { keyword: "Recovery", amount: 1 },
        condition: { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 4 },
      },
    ]);
  });
});
