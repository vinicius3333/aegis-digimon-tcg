import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-032.js";

describe("BT23-032 Shakkoumon", () => {
  it("gives an opponent Digimon a Start of Your Main Phase attack trigger and de-digivolves on DNA", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      effectText: "[Start of Your Main Phase] This Digimon attacks.",
      duration: "untilOpponentTurnEnd",
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "DeDigivolve",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      amount: 1,
      condition: { kind: "isDnaDigivolving" },
    });
  });

  it("once per turn may play a qualifying level 4-or-lower card from this stack when leaving", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(effect.frequency).toBe("OncePerTurn");
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Black"],
              levelComparison: { op: "lte", value: 4 },
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                levelComparison: { op: "lte", value: 4 },
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
