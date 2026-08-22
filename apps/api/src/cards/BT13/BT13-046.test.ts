import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-046.js";

describe("BT13-046 Kentaurosmon", () => {
  it("contains the security-count reveal effects and the attack cost/debuff sequence", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "GainMemory", amount: 3 }), expect.objectContaining({ kind: "RevealAdd" })] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Unsuspend", abortOnDecline: true }), expect.objectContaining({ kind: "ModifyDP", amount: -7000 })] });
  });

  it("loads the IR implementation into a live Kentaurosmon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-046", as: "kent" }] } });
    await s.ready();
    expect(s.perm("kent").topCard?.cardId).toBe("BT13-046");
    await settle(() => s.perm("kent").topCard?.cardId === "BT13-046", 3000);
    expect(s.perm("kent").topCard?.cardId).toBe("BT13-046");
  });
});
