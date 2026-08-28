import { describe, expect, it } from "vitest";
import { compiled as BT25_031 } from "./BT25-031.js";
import "../index.js";

describe("BT25-031 Patamon", () => {
  it("reveals three and selects one Great Angels/Dragons card plus one TS card", () => {
    const effect = BT25_031.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels", "Four Great Dragons"], match: "trait" }],
        },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
  });

  it("keeps inherited Barrier", () => {
    expect(BT25_031.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
  });
});
