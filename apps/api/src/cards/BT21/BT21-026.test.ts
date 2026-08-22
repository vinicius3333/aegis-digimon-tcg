import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-026.js";

describe("BT21-026 compiled implementation", () => {
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

  it("reduces its play cost by two per opposing Digimon and preserves all three keywords", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          scaling: { per: 1, filter: { controller: "opponent", kind: ["Digimon"] }, unit: "cards" },
          actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2 }],
        },
      ],
    });
    for (const keyword of ["Rush", "Raid", "Blocker"])
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword })] }),
      );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "onDeletionOf",
            sourceFilter: { controller: "opponent", kind: ["Digimon"] },
            actions: [
              { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
            ],
          },
        ],
      }),
    );
  });
});
