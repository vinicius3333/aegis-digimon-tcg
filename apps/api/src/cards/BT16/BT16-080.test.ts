import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
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
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }], security: ["BT1-090"] },
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

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-080")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});

describe("BT16-080 Shroudmon — KB Q&A rulings", () => {
  async function digivolveWithSecurity(securityCount: number) {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-073", as: "base" }],
          hand: [{ card: "BT16-080", as: "shroud" }],
          security: securityCount,
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "suspendedTarget", dp: 10000, suspended: true },
            { card: "BT1-042", as: "unsuspendedTarget", dp: 10000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredTargets },
    );
    preferredTargets.push(s.perm("suspendedTarget").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    const unsuspendedId = s.perm("unsuspendedTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shroud").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-080");
    await settle(() => s.perm("suspendedTarget").currentDP === 3000);
    return {
      s,
      unsuspendedStillInPlay: () => s.state.players[1]!.battleArea.some((p) => p.permanentId === unsuspendedId),
    };
  }

  it("applies both the -7000 DP and the unsuspended deletion with exactly 3 security cards (Q2666)", async () => {
    const exactlyThree = await digivolveWithSecurity(3);
    await settle(() => !exactlyThree.unsuspendedStillInPlay());
    expect(exactlyThree.s.perm("suspendedTarget").currentDP).toBe(3000);
    expect(exactlyThree.s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-042");

    const four = await digivolveWithSecurity(4);
    await drainMicrotasks();
    expect(four.s.perm("suspendedTarget").currentDP).toBe(3000);
    expect(four.unsuspendedStillInPlay()).toBe(true);
  });

  it("recovers from the deck only until security reaches 3, and does nothing at 3 or more (Q2667)", async () => {
    async function deleteShroudmonInBattle(securityCount: number) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT16-080", as: "shroud", suspended: true }],
            security: securityCount,
            deck: [
              { card: "BT1-009", as: "deckTop" },
              { card: "BT1-013", as: "deckSecond" },
              { card: "BT1-050", as: "deckThird" },
            ],
          },
          1: { battleArea: [{ card: "BT1-024", as: "attacker", dp: 20000 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.turnSeat = 1;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("shroud").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT16-080"));
      if (securityCount < 3) await settle(() => s.state.players[0]!.security.length === 3);
      await drainMicrotasks();
      return s;
    }

    const fromOne = await deleteShroudmonInBattle(1);
    const recoveredIds = [fromOne.inst("deckTop").instanceId, fromOne.inst("deckSecond").instanceId];
    expect(fromOne.state.players[0]!.security).toHaveLength(3);
    expect(fromOne.state.players[0]!.security.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining(recoveredIds),
    );
    expect(fromOne.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      fromOne.inst("deckThird").instanceId,
    ]);

    const fromFour = await deleteShroudmonInBattle(4);
    expect(fromFour.state.players[0]!.security).toHaveLength(4);
    expect(fromFour.state.players[0]!.deck).toHaveLength(3);
  });
});
