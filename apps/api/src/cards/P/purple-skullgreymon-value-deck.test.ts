import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-101.js";
import "./P-102.js";

describe("P-101/P-102 purple value line — mixed archetype flow", () => {
  it("turns Raremon's attack discard into SkullGreymon's On Deletion replay target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-102", as: "skullGreymon", under: ["P-101"] }],
          hand: [{ card: "BT2-069", as: "recycledRookie" }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", dp: 4_000, suspended: true, as: "battleTarget" },
            { card: "BT1-010", dp: 3_000, as: "levelThreeTarget" },
            { card: "BT1-114", dp: 15_000, as: "counterAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const battleTargetId = s.perm("battleTarget").permanentId;
    const levelThreeTargetId = s.perm("levelThreeTarget").permanentId;
    const skullGreymonId = s.perm("skullGreymon").permanentId;
    const skullGreymonInstanceId = s.perm("skullGreymon").topCard.instanceId;
    const raremonInstanceId = s.perm("skullGreymon").stack[0]!.instanceId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: skullGreymonId,
      target: { kind: "permanent", permanentId: battleTargetId },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.trash.some(
        (card) => card.instanceId === s.inst("recycledRookie").instanceId,
      ) &&
      !s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === battleTargetId,
      ) &&
      !s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === levelThreeTargetId,
      )
    );

    // Raremon paid its inherited attack cost with the rookie, so SkullGreymon's
    // later On Deletion can recover that exact card rather than a pre-seeded target.
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("counterAttacker").permanentId,
      target: { kind: "permanent", permanentId: skullGreymonId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("recycledRookie").instanceId,
    ));

    expect(s.state.players[0]!.trash.some(
      (card) => card.instanceId === skullGreymonInstanceId,
    )).toBe(true);
    expect(s.state.players[0]!.trash.some(
      (card) => card.instanceId === raremonInstanceId,
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
