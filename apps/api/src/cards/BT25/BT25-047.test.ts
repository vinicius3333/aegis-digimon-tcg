import { describe, expect, it } from "vitest";
import { compiled as BT25_047 } from "./BT25-047.js";
import "../index.js";

describe("BT25-047 Mochimon", () => {
  it("reveals three and adds Vegetation/Shaman plus TS", () => {
    const onPlay = BT25_047.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect((onPlay?.actions?.[0] as { add?: unknown }).add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vegetation", "Shaman"], match: "trait" }] },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
      }),
    ]);
    const inherited = BT25_047.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
    });
  });
});
