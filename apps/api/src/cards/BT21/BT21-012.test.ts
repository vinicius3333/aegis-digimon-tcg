import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-012.js";

describe("BT21-012 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("plays a red Tamer with inherited effects by suspending this Digimon, then places it under that Tamer", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "Main",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { hasInheritedEffects: true, controller: "mine", kind: ["Tamer"], colors: ["Red"] },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            cost: {
              kind: "suspend",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              raw: "By suspending this Digimon",
            },
            optional: true,
            abortOnDecline: true,
          },
          {
            kind: "PlaceUnder",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            underFilter: { controllerDefault: "mine", kind: ["Tamer"] },
            condition: { kind: "ifThisEffectActed", raw: "you did" },
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            amount: 2000,
            duration: "permanent",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      }),
    ]);
  });
});
