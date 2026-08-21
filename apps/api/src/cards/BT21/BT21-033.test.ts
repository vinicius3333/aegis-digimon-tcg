import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-033.js";

describe("BT21-033 compiled implementation", () => {
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

  it("reveals three, adds one Avian/Bird and one WG card, then bottoms the rest", () => {
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");

    expect(onPlay?.actions).toEqual([
      {
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "trait" }],
            },
            count: 1,
            to: "hand",
          },
          {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["WG"], match: "trait" }],
            },
            count: 1,
            to: "hand",
          },
        ],
        rest: "deckBottom",
      },
    ]);
  });

  it("preserves the zero-cost WG digivolution requirement and inherited Jamming", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["WG"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });
});
