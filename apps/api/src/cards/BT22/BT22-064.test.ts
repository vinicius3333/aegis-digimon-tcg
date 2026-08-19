import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-064.js";

describe("BT22-064 Diaboromon", () => {
  it("keeps Alliance and the two optional Diaboromon Token play timings", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
      }),
    );

    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlayToken", tokens: ["Diaboromon"], count: 1, payCost: false, optional: true }],
      });
    }
  });

  it("deletes the opponent's lowest-play-cost Digimon when another Unidentified Digimon is played", () => {
    const watcher = compiled.effects.find((effect) => effect.trigger === "AllTurns");

    expect(watcher).toMatchObject({ frequency: "OncePerTurn" });
    expect(watcher?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: {
          controller: "mine",
          excludeSelf: true,
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Unidentified"], match: "trait" }],
        },
        actions: [
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
              count: 1,
            },
          },
        ],
      },
    ]);
  });

  it("requires Infermon or a level 5 CS Digimon for 3 memory", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Infermon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["CS"], cost: 3, isAlternate: true },
    ]);
  });
});
