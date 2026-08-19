import { describe, expect, it } from "vitest";
import { compiled as BT24_058 } from "./BT24-058.js";

describe("BT24-058 Blimpmon", () => {
  it("searches the two printed destination branches on play and digivolving", () => {
    const effects = BT24_058.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      const reveal = effect.actions?.[0] as any;
      expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
      // One add entry offers both printed destinations: `to` is the default and `orDispositions`
      // carries the alternative, which is the pair runRevealAdd presents as one choice.
      expect(reveal.add).toHaveLength(1);
      expect(reveal.add[0]).toMatchObject({
        to: "hand",
        orDispositions: [expect.objectContaining({ to: "placeUnder" })],
      });
    }
    expect(BT24_058.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Reboot");
  });
});
