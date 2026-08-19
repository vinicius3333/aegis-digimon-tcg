import { describe, expect, it } from "vitest";
import { compiled as BT24_032 } from "./BT24-032.js";

describe("BT24-032 Pipomon", () => {
  it("reveals three and searches Appmon plus System/Transmutation", () => {
    const reveal = BT24_032.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
    expect(reveal.add[0]).toMatchObject({
      to: "hand",
      filter: { nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
    });
    expect(reveal.add[1]).toMatchObject({
      to: "hand",
      filter: { nameOrTrait: [{ tokens: ["System", "Transmutation (App Name)"], match: "trait" }] },
    });
  });
});
