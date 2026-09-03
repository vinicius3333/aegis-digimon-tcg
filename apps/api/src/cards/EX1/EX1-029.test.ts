import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-087.js";
import "./EX1-029.js";

describe("EX1-029 MagnaAngemon", () => {
  it("gets +4000 DP when attacking with 3 or more security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-029", as: "magna", dp: 7000 }], security: ["BT1-001", "BT1-001", "BT1-001"] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magna").currentDP === 11000);
    expect(s.perm("magna").currentDP).toBe(11000);
  });

  it("gains 1 memory from public security replacement even when the net count is unchanged (Q3213)", async () => {
    const preferredSelection: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-029"] }],
          hand: [{ card: "BT1-087", as: "takeru" }],
          security: ["BT1-009", { card: "BT1-087", as: "yellowChoice" }],
          deck: [{ card: "BT1-010", as: "recovery" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredSelection },
    );
    preferredSelection.push(s.inst("yellowChoice").instanceId);
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yellowChoice").instanceId) &&
        s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId),
    );
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yellowChoice").instanceId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3); // 6 - BT1-087's play cost 4 + EX1-029's inherited memory 1
  });

  it("does not gain the attack bonus with fewer than three security cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-029", as: "magna", dp: 7000 }], security: ["BT1-001", "BT1-001"] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magna").isSuspended);
    expect(s.perm("magna").currentDP).toBe(7000);
  });

  it("keeps the attack bonus through the opponent turn and expires after it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-029", as: "magna", dp: 7000 }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: {
        security: ["BT1-001", "BT1-001"],
        hand: ["BT1-009"],
        deck: ["BT1-001", "BT1-001", "BT1-001"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magna").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magna").currentDP === 11000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("magna").currentDP).toBe(11000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.perm("magna").currentDP).toBe(7000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not gain memory twice when public security replacement repeats in one turn", async () => {
    const preferredSelection: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-031", as: "host", under: ["EX1-029"] }],
          hand: [
            { card: "BT1-087", as: "firstTakeru" },
            { card: "BT1-087", as: "secondTakeru" },
          ],
          security: ["BT1-009", { card: "BT1-087", as: "firstChoice" }],
          deck: [
            { card: "BT1-045", as: "firstRecovery" },
            { card: "BT1-010", as: "secondRecovery" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredSelection },
    );
    const firstChoiceId = s.inst("firstChoice").instanceId;
    const secondTakeruId = s.inst("secondTakeru").instanceId;
    const secondRecoveryId = s.inst("secondRecovery").instanceId;
    preferredSelection.push(firstChoiceId);
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTakeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === firstChoiceId));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(3);

    const secondChoiceId = s.inst("firstRecovery").instanceId;
    preferredSelection.splice(0, preferredSelection.length, secondChoiceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTakeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.hand.some((card) => card.instanceId === secondTakeruId) &&
        s.state.players[0]!.security.some((card) => card.instanceId === secondRecoveryId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.memory).toBe(-1); // second play costs 4; EX1-029 is once per turn
  });
});
