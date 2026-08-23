import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-204.js";

describe("P-204 Release of the Sealed Knight!", () => {
  it("gates Draw 2 and placement behind trashing an X Antibody or Chronicle card", () => {
    expect(runtimeCompiledCard("P-204")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
              },
            },
          },
          abortOnDecline: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("grants Delay when either player's Digimon attacks and allows the Chronicle evolution", () => {
    const card = runtimeCompiledCard("P-204")!;
    expect(card.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      event: "whenAttacking",
      sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
    });
    expect(card.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          optional: true,
          into: expect.objectContaining({
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [
              { tokens: ["Alphamon"], match: "name" },
              { tokens: ["Chronicle"], match: "trait" },
            ],
          }),
        }),
      ]),
    );
  });

  it("activates its Main effect from Security", () => {
    expect(runtimeCompiledCard("P-204")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });
});
