import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-074.js";
import "./BT10-013.js";
import "./BT10-042.js";

describe("BT10 Venusmon security-attack control deck gauntlet", () => {
  it("evolves from Boutmon, suppresses timings, but only forbids attacks aimed at Venusmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-074", as: "boutmon", suspended: true },
            { card: "BT1-043", as: "otherTarget", suspended: true },
          ],
          hand: [{ card: "BT10-042", as: "venusmon" }],
          security: 3,
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT10-013", as: "shoutmonX5" },
            { card: "BT1-010", as: "plainAttacker" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: ["BT1-004"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("boutmon").permanentId,
        instanceId: s.inst("venusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("boutmon").topCard.cardId === "BT10-042" &&
        observe(s.engine).keywordAmount(s.perm("plainAttacker"), "SecurityAttack") === -1,
    );

    expect(observe(s.engine).keywordAmount(s.perm("shoutmonX5"), "SecurityAttack")).toBe(0);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    const opponentMain = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => opponentMain.isOpen);
    await s.engine.recomputeContinuousEffects();
    await settle(() => observe(s.engine).timingEffectDisabled(s.perm("shoutmonX5"), "whenAttacking"));
    expect(observe(s.engine).timingEffectDisabled(s.perm("shoutmonX5"), "whenAttacking")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("plainAttacker"), "whenDigivolving")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("shoutmonX5").permanentId,
        target: { kind: "permanent", permanentId: s.perm("boutmon").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("shoutmonX5").permanentId,
        target: { kind: "permanent", permanentId: s.perm("otherTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("plainAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("plainAttacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(3);
    const endPhaseResult = opponentMain.isOpen ? s.engine.applyIntent(1, { type: "endPhase" }) : { ok: true };
    expect(endPhaseResult).toEqual({ ok: true });
    await opponentTurn;
  });
});
