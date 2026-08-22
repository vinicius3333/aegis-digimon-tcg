import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-034.js";

describe("BT21-034 compiled implementation", () => {
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

  it("draws one for its controller whenever this Digimon suspends", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");

    expect(allTurns?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
      },
    ]);
  });

  it("preserves the WG alternate Digivolution and inherited Jamming", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });
});
