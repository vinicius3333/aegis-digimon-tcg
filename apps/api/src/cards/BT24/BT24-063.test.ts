import { describe, expect, it } from "vitest";
import { compiled as BT24_063 } from "./BT24-063.js";

describe("BT24-063 Locomon", () => {
  it("has the same play-from-reveal search on play and digivolving", () => {
    const effects = BT24_063.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
      expect((effect.actions?.[0] as any).add?.[0]).toMatchObject({
        count: 1,
        to: "play",
        optional: true,
        filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Machine", "Cyborg", "TS"], match: "trait" }] },
      });
    }
  });
});
