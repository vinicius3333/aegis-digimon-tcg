import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
