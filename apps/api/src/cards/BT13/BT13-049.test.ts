import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-049.js";

describe("BT13-049 Lalamon", () => {
  it("searches the green trait/Yoshino pair and installs the conditional reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldDigivolve" })] });
  });
});
