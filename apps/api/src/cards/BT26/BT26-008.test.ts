import { EffectTiming, Phase, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT26-008.js";
import "../index.js";

const CARD_ID = "BT26-008";

describe("BT26-008 Kotemon", () => {
  it("exposes the exact zero-cost Lv.2 Shambala-or-TS alternate evolution", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["Shambala", "TS"],
      cost: 0,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        breeding: { card: "EX12-004", as: "purpleShambalaEgg" },
        hand: [{ card: CARD_ID, as: "kotemon" }],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("purpleShambalaEgg").permanentId,
        instanceId: legal.inst("kotemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("purpleShambalaEgg").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const tsLegal = setupEngine({
      0: {
        breeding: { card: "BT24-002", as: "blueTsEgg" },
        hand: [{ card: CARD_ID, as: "kotemon" }],
      },
    });
    expect(
      tsLegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: tsLegal.perm("blueTsEgg").permanentId,
        instanceId: tsLegal.inst("kotemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => tsLegal.perm("blueTsEgg").topCard.cardId === CARD_ID);
    expect(tsLegal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "plainEgg" },
        hand: [{ card: CARD_ID, as: "kotemon" }],
      },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainEgg").permanentId,
        instanceId: illegal.inst("kotemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("on play offers only its controller's Shambala/TS Digimon and applies both bonuses to the chosen one", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-012", as: "shambala" },
          { card: "BT1-009", as: "plainAlly" },
        ],
        hand: [{ card: CARD_ID, as: "kotemon" }],
      },
      1: { battleArea: [{ card: "BT26-013", as: "opponentShambala" }] },
    });
    s.state.memory = 3;
    const shambala = s.perm("shambala");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(pending.seat).toBe(0);
    if (pending.kind !== "chooseTargets") throw new Error("expected Kotemon target choice");
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)?.req;
    const playedKotemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;
    expect(new Set(request?.options?.candidateInstanceIds)).toEqual(
      new Set([shambala.permanentId, playedKotemon.permanentId]),
    );
    expect(request?.options?.candidateInstanceIds).not.toContain(s.perm("plainAlly").permanentId);
    expect(request?.options?.candidateInstanceIds).not.toContain(s.perm("opponentShambala").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [shambala.permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => shambala.currentDP === 9000);

    expect(observe(s.engine).hasPierce(shambala)).toBe(true);
    expect(s.perm("plainAlly").currentDP).not.toBe(9000);
  });

  it("When Moving publicly grants the same bonuses and expires them at that turn's end", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "mover" },
          battleArea: [{ card: "BT26-012", as: "beneficiary" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("beneficiary").currentDP === 9000);
    expect(observe(s.engine).hasPierce(s.perm("beneficiary"))).toBe(true);

    advance(s.engine).ledgers.modifiers.sweep(s.state, "eachTurnEnd", 0);
    expect(s.perm("beneficiary").currentDP).toBe(6000);
    expect(observe(s.engine).hasPierce(s.perm("beneficiary"))).toBe(false);
  });

  it("binds When Moving to Kotemon's own permanent rather than another mover", () => {
    const source = {
      instanceId: "kotemon-card",
      cardId: CARD_ID,
      ownerSeat: 0,
      permanent: () => ({ permanentId: "kotemon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as CardSource;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnMove, source)[0]!;

    expect(effect.canTrigger({ source, trigger: { movedPermanentId: "kotemon" } } as EffectContext)).toBe(true);
    expect(effect.canTrigger({ source, trigger: { movedPermanentId: "other" } } as EffectContext)).toBe(false);
  });

  it("grants inherited +2000 DP only to its host and only on its owner's turn", async () => {
    const ownersTurn = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [CARD_ID] },
          { card: CARD_ID, as: "topKotemon" },
        ],
      },
    });
    await ownersTurn.ready();

    expect(ownersTurn.perm("host").currentDP).toBe(5000);
    expect(ownersTurn.perm("topKotemon").currentDP).toBe(1000);

    const opponentsTurn = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [CARD_ID] }] },
    });
    opponentsTurn.state.turnSeat = 1;
    await opponentsTurn.ready();
    expect(opponentsTurn.perm("host").currentDP).toBe(3000);
  });
});
