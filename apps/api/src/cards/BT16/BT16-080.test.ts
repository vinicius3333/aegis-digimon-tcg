import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-080.js";
import "../BT18/BT18-084.js";
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
        target: { kind: "permanent", permanentId: s.perm("shroud").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]?.security.length === 3);
    expect(s.state.players[0]?.security).toHaveLength(3);
  });

  it("runs the shared End of Attack branches after a natural player attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-080", as: "shroud" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }], security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shroud").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("prevents a natural opponent-effect deletion by trashing top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-080", as: "shroud" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: { hand: [{ card: "BT18-084", as: "removal" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-080")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
