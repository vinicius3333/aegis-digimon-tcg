import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-075.js";

describe("EX12-075 Kunlun's Imperial Decree", () => {
  it("models the Use Requirement and main search-to-battle-area sequence", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords);
    expect(main?.actions).toEqual([
      expect.objectContaining({
        kind: "RevealAdd",
        revealCount: 3,
        add: [{ filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }] }, count: 1, to: "hand" }],
        rest: "deckBottom",
      }),
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });

  it("keeps Delay, gain 2 memory, and Security placement as separate printed clauses", () => {
    expect(compiled.effects).toContainEqual({
      trigger: "Main",
      actions: [{ kind: "GainMemory", amount: 2 }],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    });
    expect(compiled.effects).toContainEqual({
      trigger: "Security",
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
      isSecurity: true,
    });
  });
});
