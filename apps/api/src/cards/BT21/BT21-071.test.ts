import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-071.js";
describe("BT21-071 Scopemon", () => {
  it("gains memory after placing an Appmon or Three Musketeers card", () => {
    for (const e of compiled.effects.filter((effect) => ["OnPlay", "WhenDigivolving"].includes(effect.trigger)))
      expect(e.actions[0]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "place" },
      });
  });

  it("draws 2 and trashes 2 when linked", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects[0]).toEqual({
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 2 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      ],
    });
  });

  it("keeps the evolution requirement and complete coverage metadata", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, texts: ["Three Musketeers"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
