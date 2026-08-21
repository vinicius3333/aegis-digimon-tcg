import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-054.js";

describe("BT21-054 Shotmon", () => {
  it("preserves both alternate Digivolution requirements and the Appmon link requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, texts: ["Three Musketeers"], cost: 0, isAlternate: true },
      { traits: ["Appmon"], cost: 0, isAlternate: true, level: 2 },
    ]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
  });

  it("requires trashing an Appmon or Three Musketeers card from a digivolution stack", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = effect?.actions[0];

    expect(action).toMatchObject({ kind: "DeDigivolve", amount: 1, optional: true, abortOnDecline: true });
    const typedAction = action as { target?: unknown; cost?: unknown } | undefined;
    expect(typedAction?.target).toEqual({ filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 });
    expect(typedAction?.cost).toMatchObject({
      kind: "trash",
      target: {
        filter: {
          controller: "mine",
          zone: "digivolutionCards",
          nameOrTrait: [
            { tokens: ["Appmon"], match: "trait" },
            { tokens: ["Three Musketeers"], match: "trait", orPrevious: true },
          ],
        },
        count: 1,
      },
    });
  });

  it("deletes one opposing play-cost-3-or-less Digimon when linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenLinking");
    expect(effect).toEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 3 }, count: 1 },
          },
        ],
      }),
    );
  });
});
