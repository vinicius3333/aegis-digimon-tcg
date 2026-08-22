import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-033.js";

describe("BT13-033 MirageGaogamon: Burst Mode", () => {
  it("contains the complete compiled digivolving and attacking effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: expect.arrayContaining([expect.objectContaining({ kind: "Return", to: "hand" }), expect.objectContaining({ kind: "GainMemory" })]) });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", actions: [expect.objectContaining({ kind: "Unsuspend", cost: expect.objectContaining({ kind: "return", to: "deckBottom" }) })] });
  });

  it("loads the registered card into the battle area with its printed attack trigger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-033", as: "mirage" }] } });
    await s.ready();
    expect(s.perm("mirage").topCard?.cardId).toBe("BT13-033");
    expect(compiled.effects[1]!.actions[0]).toMatchObject({ condition: { value: 9 } });
  });
});
