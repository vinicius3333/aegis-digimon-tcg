import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-080.js";
import "../index.js";

describe("BT16-080 Shroudmon", () => {
  it("runs both branches at exactly 3 security and shares the once-per-turn key", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "dp-or-delete",
      actions: [
        { kind: "ModifyDP", amount: -7000, condition: { kind: "securityAtLeast", value: 3 } },
        { kind: "Delete", condition: { kind: "securityAtMost", value: 3 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "EndOfAttack", sharedUseKey: "dp-or-delete" });
  });

  it("prevents opponent-effect leaving by paying the security cost", () => {
    expect(compiled.effects[2]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "opponentEffect",
      mode: "prevent",
      condition: { kind: "securityAtLeast", value: 3 },
      cost: { kind: "trashSecurityTop" },
    });
  });

  it("recovers repeatedly to 3 after deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-080", as: "shroud" }], deck: ["BT1-001", "BT1-001", "BT1-001"] },
      1: { battleArea: [{ card: "BT16-080", as: "attacker", dp: 14000 }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    s.perm("shroud").isSuspended = true;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "digimon", permanentId: s.perm("shroud").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]?.security.length === 3);
    expect(s.state.players[0]?.security).toHaveLength(3);
  });
});
