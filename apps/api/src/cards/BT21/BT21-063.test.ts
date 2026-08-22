import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-063.js";

describe("BT21-063 Gumdramon", () => {
  it("preserves both zero-cost alternate Digivolution requirements and inherited DP gain", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, texts: ["Save"], cost: 0, isAlternate: true },
      { traits: ["Hero"], cost: 0, isAlternate: true, level: 2 },
    ]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 2000,
            duration: "permanent",
          },
        ],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("requires trashing a Save-text or Hero card to draw two", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = onPlay?.actions[0] as { cost?: unknown } | undefined;

    expect(action).toMatchObject({ kind: "Draw", controller: "mine", amount: 2, optional: true, abortOnDecline: true });
    expect(action?.cost).toMatchObject({
      kind: "trash",
      target: {
        filter: {
          zone: "hand",
          controller: "mine",
          keywords: ["Save"],
          nameOrTrait: [{ tokens: ["Hero"], match: "trait" }],
        },
        count: 1,
      },
    });
    expect(compiled.effects).toContainEqual({
      trigger: "OnDeletion",
      actions: [],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    });
  });
});
