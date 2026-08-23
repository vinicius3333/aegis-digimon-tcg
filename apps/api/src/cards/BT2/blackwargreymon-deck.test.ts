import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-112.js";
import "../BT8/BT8-067.js";

describe("BT2/BT8 BlackWarGreymon deck", () => {
  it("reduces its hand play cost while the opposing lane has at least 10000 DP", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT2-112", as: "blackwar" }],
      },
      1: {
        battleArea: [{ card: "BT1-084", as: "qualifyingOpponent" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blackwar").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("blackwar").instanceId,
      ),
    );

    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("uses MetalGreymon's Dragonkin inherited effect to attack an unsuspended highest-DP target and restand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT2-112",
            as: "blackwar",
            dp: 20000,
            under: ["BT8-067"],
          },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-084", as: "highest" },
          { card: "BT1-074", as: "lower", suspended: true },
        ],
      },
    });
    const highestId = s.perm("highest").permanentId;
    const combat = s.engine as unknown as { combat: { isAttacking: boolean } };
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blackwar").permanentId,
        target: { kind: "permanent", permanentId: highestId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !combat.combat.isAttacking &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highestId) &&
        !s.perm("blackwar").isSuspended,
      5000,
    );

    expect(s.perm("blackwar").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});
