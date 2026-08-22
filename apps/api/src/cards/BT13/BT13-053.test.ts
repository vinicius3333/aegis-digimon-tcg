import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-053.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-053 Mihiramon", () => {
  it("suspends a target and prevents unsuspension without undoing the suspension", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "Suspend" }), expect.objectContaining({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "Replacement", event: "wouldDigivolve" })] });
  });

  it("suspends an eligible opponent Digimon and keeps it suspended", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT13-053", as: "mihira" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihira").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended, 3000);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
