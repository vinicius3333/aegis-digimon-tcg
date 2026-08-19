import { describe, expect, it } from "vitest";
import { compiled as BT24_060 } from "./BT24-060.js";

describe("BT24-060 Hisyaryumon", () => {
  it("captures the printed reveal, suspension, attack, and replacement structure", () => {
    const attack = BT24_060.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(attack?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
    expect(attack?.actions?.[1]).toMatchObject({ kind: "Digivolve", payCost: false, into: { fromRevealedRef: true } });
    const inherited = BT24_060.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).affectsAll).toBe(true);
  });
});
