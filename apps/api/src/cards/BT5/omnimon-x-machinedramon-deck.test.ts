import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-114.js";
import "../EX1/EX1-073.js";
import "./BT5-087.js";
import "./BT5-111.js";
import "../index.js"; // the full catalog is registered in a real match

describe("Machinedramon, Omnimon Zwart, and Omnimon X deck", () => {
  it("can't end an opposing attack when Omnimon X has only one digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-087", as: "omniZwart" }],
          hand: [{ card: "BT5-111", as: "omniX" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "AD1-015", as: "attacker" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("omniZwart").permanentId,
      instanceId: s.inst("omniX").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("omniZwart").topCard.cardId === "BT5-111");

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.security.length === 1 &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking
    );

    expect(s.perm("omniZwart").stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-087")).toBe(false);
    assertNoLoudGap(s);
  });

  it("uses the Omnimon bridge offensively, then trashes Cyborg sources to stop the reply", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "BT5-087",
            as: "omniZwart",
            under: ["EX1-073", "BT1-114", "EX1-048"],
          }],
          hand: [{ card: "BT5-111", as: "omniX" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "AD1-001", as: "deleteTarget" },
            { card: "AD1-015", as: "replyAttacker" },
          ],
          security: ["BT1-003", "BT1-004"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("deleteTarget").permanentId);
    const deleteTargetId = s.perm("deleteTarget").permanentId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("omniZwart").permanentId,
      instanceId: s.inst("omniX").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("omniZwart").topCard.cardId === "BT5-111");

    expect(s.state.memory).toBe(0);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("omniZwart").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === deleteTargetId) &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    // The reply happens on the opponent's own turn: re-arm the phase the ended attack closed.
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.perm("replyAttacker").isSuspended = false;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("replyAttacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking &&
      s.perm("omniZwart").stack.length === 2,
    );

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.perm("omniZwart").topCard.cardId).toBe("BT5-111");
  });
});
