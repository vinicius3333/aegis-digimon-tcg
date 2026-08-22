import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-058.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-058 Leopardmon: Leopard Mode", () => {
  it("restricts opponent unsuspension, charges suspension for attack, and trashes its top card at turn end", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "Suspend" }), expect.objectContaining({ kind: "Restrict", restriction: "unsuspend" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", actions: [expect.objectContaining({ kind: "Unsuspend", cost: expect.objectContaining({ kind: "suspend" }) })] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "EndOfYourTurn", actions: [expect.objectContaining({ kind: "Trash", target: expect.objectContaining({ topCardOnly: true }) }), expect.objectContaining({ kind: "Unsuspend" })] });
  });

  it("loads the compiled Leopardmon: Leopard Mode implementation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-058", as: "leopard" }] } });
    await s.ready();
    expect(s.perm("leopard").topCard?.cardId).toBe("BT13-058");
  });
});
