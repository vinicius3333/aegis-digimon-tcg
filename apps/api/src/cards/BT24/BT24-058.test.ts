import { describe, expect, it } from "vitest";
import { compiled as BT24_058 } from "./BT24-058.js";

describe("BT24-058 Blimpmon", () => {
  it("searches the two printed destination branches on play and digivolving", () => {
    const effects = BT24_058.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      const reveal = effect.actions?.[0] as any;
      expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
      expect(reveal.add).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ to: "hand", optional: true }),
          expect.objectContaining({ to: "placeUnder", optional: true }),
        ]),
      );
    }
    expect(BT24_058.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Reboot");
  });
});
