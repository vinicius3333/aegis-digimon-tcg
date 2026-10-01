import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle, type BoardSpec } from "../../engine/testkit/harness.js";
import "./BT2-112.js";

describe("BT2-112 BlackWarGreymon", () => {
  it("reduces its play cost by 6 while the opponent has a 10000 DP Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT2-112", as: "blackwar" }] },
      1: { battleArea: [{ card: "BT1-084", as: "large" }] },
    });
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blackwar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("blackwar").instanceId),
    );

    expect(s.state.memory).toBe(0);
  });

  it("does not reduce its play cost when every opposing Digimon has less than 10000 DP", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT2-112", as: "blackwar" }] },
      1: { battleArea: [{ card: "BT2-046", as: "belowThreshold", dp: 9000 }] },
    });
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blackwar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("blackwar").instanceId),
    );
    expect(s.state.memory).toBe(-6);
  });

  it("unsuspends when attacking either opponent Digimon tied for highest DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-112", as: "blackwar" }] },
      1: {
        battleArea: [
          { card: "BT1-074", as: "highest", suspended: true },
          { card: "BT1-074", as: "tiedHighest", suspended: true },
          { card: "BT1-010", as: "lower", suspended: true },
        ],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blackwar").permanentId,
        target: { kind: "permanent", permanentId: s.perm("tiedHighest").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("blackwar").isSuspended);

    expect(s.perm("blackwar").isSuspended).toBe(false);
  });

  it("stays suspended when attacking below the opponent's highest DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-112", as: "blackwar", dp: 20000 }] },
      1: {
        battleArea: [
          { card: "BT1-084", as: "highest", suspended: true },
          { card: "BT1-010", as: "lower", suspended: true },
        ],
      },
    });
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blackwar").permanentId,
        target: { kind: "permanent", permanentId: s.perm("lower").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !combat.combat.isAttacking);

    expect(s.perm("blackwar").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("highest").permanentId)).toBe(true);
  });
});

describe("BT2-112 BlackWarGreymon — KB Q&A rulings", () => {
  type Board = BoardSpec;

  async function attackWithBlackWarGreymon(board: Board, targetAlias: string) {
    const s = setupEngine(board);
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("blackwar").permanentId,
      target: { kind: "permanent", permanentId: s.perm(targetAlias).permanentId },
    });
    if (result.ok) {
      await settle(() => !combat.combat.isAttacking);
    }
    return { s, result };
  }

  it("compares only the opponent's Digimon, ignoring your own higher-DP Digimon (Q1044)", async () => {
    const board: Board = {
      0: {
        battleArea: [
          { card: "BT2-112", as: "blackwar" },
          { card: "BT1-084", as: "ownHigher" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-074", as: "opponentHighest", suspended: true },
          { card: "BT1-010", as: "opponentLower", suspended: true },
        ],
      },
    };

    const highest = await attackWithBlackWarGreymon(board, "opponentHighest");
    expect(highest.result).toEqual({ ok: true });
    expect(getCardDefinition("BT1-084")!.dp).toBeGreaterThan(getCardDefinition("BT1-074")!.dp!);
    expect(highest.s.perm("blackwar").isSuspended).toBe(false);

    const lower = await attackWithBlackWarGreymon(board, "opponentLower");
    expect(lower.result).toEqual({ ok: true });
    expect(lower.s.perm("blackwar").isSuspended).toBe(true);
  });

  it("unsuspends when attacking any of the opponent's Digimon tied for highest DP (Q1045)", async () => {
    const board: Board = {
      0: { battleArea: [{ card: "BT2-112", as: "blackwar" }] },
      1: {
        battleArea: [
          { card: "BT1-074", as: "firstTied", suspended: true },
          { card: "BT1-074", as: "secondTied", suspended: true },
          { card: "BT1-010", as: "lower", suspended: true },
        ],
      },
    };

    for (const tiedAlias of ["firstTied", "secondTied"]) {
      const tied = await attackWithBlackWarGreymon(board, tiedAlias);
      expect(tied.result).toEqual({ ok: true });
      expect(tied.s.perm("blackwar").isSuspended).toBe(false);
    }

    const lower = await attackWithBlackWarGreymon(board, "lower");
    expect(lower.result).toEqual({ ok: true });
    expect(lower.s.perm("blackwar").isSuspended).toBe(true);
  });

  it("cannot unsuspend by attacking an unsuspended highest-DP Digimon, and that Digimon still sets the highest DP (Q1046)", async () => {
    const board: Board = {
      0: { battleArea: [{ card: "BT2-112", as: "blackwar" }] },
      1: {
        battleArea: [
          { card: "BT1-084", as: "unsuspendedHighest" },
          { card: "BT1-074", as: "suspendedLower", suspended: true },
        ],
      },
    };

    const unsuspended = await attackWithBlackWarGreymon(board, "unsuspendedHighest");
    expect(unsuspended.result).toEqual({ ok: false, reason: "illegal-target" });
    expect(unsuspended.s.perm("blackwar").isSuspended).toBe(false);

    const suspended = await attackWithBlackWarGreymon(board, "suspendedLower");
    expect(suspended.result).toEqual({ ok: true });
    expect(suspended.s.perm("blackwar").isSuspended).toBe(true);

    const withoutUnsuspendedHighest = await attackWithBlackWarGreymon(
      { ...board, 1: { battleArea: [{ card: "BT1-074", as: "suspendedLower", suspended: true }] } },
      "suspendedLower",
    );
    expect(withoutUnsuspendedHighest.result).toEqual({ ok: true });
    expect(withoutUnsuspendedHighest.s.perm("blackwar").isSuspended).toBe(false);
  });
});
