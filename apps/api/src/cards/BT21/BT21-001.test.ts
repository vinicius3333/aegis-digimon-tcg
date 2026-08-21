import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-001.js";

describe("BT21-001 compiled implementation", () => {
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

  it("fires once per turn when the opponent's security is removed and reduces the hand evolution cost", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            actions: [
              expect.objectContaining({
                kind: "Digivolve",
                from: ["hand"],
                reduceCost: 1,
                optional: true,
              }),
            ],
          }),
        ],
      }),
    ]);
  });
});
