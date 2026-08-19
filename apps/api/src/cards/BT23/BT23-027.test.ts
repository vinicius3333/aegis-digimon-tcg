import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-027.js";

describe("BT23-027 Angemon", () => {
  it("declares Barrier", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("draws one, then may DNA digivolve two of your Digimon into Shakkoumon on your turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toEqual({ kind: "Draw", controller: "mine", amount: 1 });
      expect(actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Shakkoumon"], match: "name" }] },
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
