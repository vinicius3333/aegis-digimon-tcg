import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-030.js";

describe("BT21-030 compiled implementation", () => {
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

  it("verifies the Shoutmon cost replacement, trash DigiXros expansion, stack trash, and attack return", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 1,
          cost: { kind: "placeUnder" },
          additionalEffects: [{ kind: "AllowDigiXrosMaterialsFromTrash" }],
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "TrashDigivolution",
              amount: 10,
              fromTop: true,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Return",
            to: "deckBottom",
            optional: true,
            target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" }, count: 1 },
          },
        ],
      }),
    );
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [
          {
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }],
            differentCardNumbers: true,
          },
        ],
        count: "∞",
        costReduction: 1,
      },
    ]);
  });
});
