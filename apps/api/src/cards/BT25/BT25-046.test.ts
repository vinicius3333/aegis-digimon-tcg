import { describe, expect, it } from "vitest";
import { compiled as BT25_046 } from "./BT25-046.js";
import "../index.js";

describe("BT25-046 Mochimon", () => {
  it("reveals three and adds Glowing Dawn plus green BEATBREAK", () => {
    const effect = BT25_046.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect((effect?.actions?.[0] as { add?: unknown }).add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          colors: ["Green"],
          nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }],
        },
      }),
    ]);
  });
});
