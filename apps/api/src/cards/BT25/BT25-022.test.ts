import { describe, expect, it } from "vitest";
import { compiled as BT25_022 } from "./BT25-022.js";
import "../index.js";

describe("BT25-022 Lunamon", () => {
  it("reveals three and adds one Iliad plus one TS trait card", () => {
    const effect = BT25_022.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
  });

  it("preserves inherited Jamming", () => {
    expect(BT25_022.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }] }),
      ]),
    );
  });
});
