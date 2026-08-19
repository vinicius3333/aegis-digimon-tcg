import { describe, expect, it } from "vitest";
import { compiled as BT24_043 } from "./BT24-043.js";

describe("BT24-043 Tapirmon", () => {
  it("reveals three and searches the two printed pools", () => {
    const onPlay = BT24_043.effects?.find((entry) => entry.trigger === "OnPlay");
    const reveal = onPlay?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
    expect(reveal.add[0]).toMatchObject({ to: "hand", filter: { kind: ["Digimon"] } });
    expect(reveal.add[1]).toMatchObject({ to: "hand", filter: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } });
    expect(BT24_043.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
    });
  });
});
