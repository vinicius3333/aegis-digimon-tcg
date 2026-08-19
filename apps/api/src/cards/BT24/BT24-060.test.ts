import { describe, expect, it } from "vitest";
import { compiled as BT24_060 } from "./BT24-060.js";

describe("BT24-060 Hisyaryumon", () => {
  it("captures the printed reveal, suspension, attack, and replacement structure", () => {
    const attack = BT24_060.effects?.find((entry) => entry.trigger === "WhenAttacking");
    // The digivolve rides on the reveal as `digivolveOption` (the shape runRevealAdd consumes),
    // not as a second action: it is the same decision window as the reveal, not a later one.
    expect(attack?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckTopOrBottom",
      digivolveOption: { payCost: false, into: { nameOrTrait: [{ tokens: ["DigiPolice", "SEEKERS"], match: "trait" }] } },
    });
    const inherited = BT24_060.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).affectsAll).toBe(true);
  });
});
