import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-065.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-065 PlatinumSukamon", () => {
  it("uses De-Digivolve 1 stopping at level 3 and the inherited deletion replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnDeletion", actions: [expect.objectContaining({ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Replacement", event: "wouldBeDeleted" })] });
  });

  it("loads the compiled PlatinumSukamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-065", as: "platinum" }] } });
    await s.ready();
    expect(s.perm("platinum").topCard?.cardId).toBe("BT13-065");
  });
});
