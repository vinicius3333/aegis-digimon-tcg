import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-049.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-049 Lalamon", () => {
  it("searches the green trait/Yoshino pair and installs the conditional reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldDigivolve" })] });
  });

  it("loads the compiled Lalamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-049", as: "lalamon" }] } });
    await s.ready();
    expect(s.perm("lalamon").topCard?.cardId).toBe("BT13-049");
  });
});
