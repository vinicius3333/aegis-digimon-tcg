import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-022.js";

describe("BT21-022 compiled implementation", () => {
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

  it("places a Gammamon-text Digimon as bottom material for either removal trigger and saves once from an opponent effect", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } },
                count: 1,
              },
              cost: {
                kind: "place",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
                  },
                  count: 1,
                  from: ["hand"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: "self",
                raw: "By placing 1 Digimon card with [Gammamon] in its text from your hand as this Digimon's bottom digivolution card",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            sourceFilter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
            },
            actions: [
              {
                kind: "Prevent",
                mode: "leavePlay",
                optional: true,
                abortOnDecline: true,
                cost: {
                  kind: "trash",
                  target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 3 },
                  raw: "by trashing 3 Digimon cards from its digivolution cards",
                },
              },
            ],
          },
        ],
      }),
    );
  });
});
