import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-054.js";

describe("EX12-054 Guardromon", () => {
  it("keeps Blocker on the card and as an inherited effect", () => {
    const staticEffects = compiled.effects.filter((effect) => effect.trigger === "Static");

    expect(staticEffects).toHaveLength(2);
    expect(staticEffects.every((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Blocker"))).toBe(true);
    expect(staticEffects[1]?.isInherited).toBe(true);
  });

  it("requires the Machine/Cyborg/ME hand trash before drawing on play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = effect?.actions[0];

    expect(action).toMatchObject({
      kind: "Draw",
      amount: 2,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ match: "trait", tokens: ["Machine", "Cyborg", "ME"] }],
          },
          count: 1,
        },
      },
    });
    expect(action).not.toHaveProperty("optional");
    expect(action).not.toHaveProperty("abortOnDecline");
  });

  it("uses the same mandatory cost on digivolving", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0];

    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action).not.toHaveProperty("optional");
    expect(action).not.toHaveProperty("abortOnDecline");
  });

  it("retains the alternate ME level-3 evolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["ME"], cost: 2, isAlternate: true },
    ]);
  });
});
