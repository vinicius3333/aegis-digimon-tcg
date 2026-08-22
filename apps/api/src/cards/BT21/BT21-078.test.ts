import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-078.js";
describe("BT21-078 WereGarurumon", () => {
  it("deletes level 4 or lower and triggers Alliance plus an attack", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "SubTrigger" }),
          expect.objectContaining({ kind: "Attack" }),
        ]),
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { levelComparison: { op: "lte", value: 5 } } },
        condition: { kind: "zoneColorCount", cardType: "Tamer", op: "gte", value: 2 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { levelComparison: { op: "lte", value: 4 } } },
        condition: { kind: "not" },
      });
    }
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Garurumon"], cost: 3, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
