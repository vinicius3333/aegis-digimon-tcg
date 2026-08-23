import { EffectTiming, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-055.js";
import "./BT8-057.js";
import "./BT8-102.js";
import "../P/P-036.js";

function delayEffectKey(s: EngineSetup): string {
  const boost = s.state.players[1]!.battleArea.find(({ topCard }) => topCard.cardId === "P-036")!;
  const source = (
    s.engine as unknown as {
      cardSourceOf(card: typeof boost.topCard): unknown;
    }
  ).cardSourceOf(boost.topCard);
  return effectsOf(EffectTiming.OnDeclaration, source as never)[0]!.effectKey;
}

async function unsuspendForActivePhase(s: EngineSetup): Promise<string[]> {
  return (
    s.engine as unknown as {
      unsuspendForActivePhase(seat: 0): Promise<string[]>;
    }
  ).unsuspendForActivePhase(0);
}

describe("BT8 Shivamon Samādhi Śānti control deck", () => {
  it("binds the suspension target, chains Active-phase effects, blocks hand Options, and permits Delay", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-055", as: "climbmon" }],
        hand: [
          { card: "BT8-102", as: "samadhi" },
          { card: "BT8-057", as: "shivamon" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT8-046", as: "opponentDigimon" },
          { card: "BT1-086", as: "opponentTamer" },
        ],
        hand: [
          { card: "P-036", as: "armedDelay" },
          { card: "BT8-102", as: "blockedOption" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();
    const armedDelayInstanceId = s.inst("armedDelay").instanceId;
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: armedDelayInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === armedDelayInstanceId),
    );
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    const ownPermanentId = s.perm("climbmon").permanentId;
    const opponentDigimonId = s.perm("opponentDigimon").permanentId;
    const opponentTamerId = s.perm("opponentTamer").permanentId;
    const armedDelayEffectKey = delayEffectKey(s);
    const delayIsOnBoard = () =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === armedDelayInstanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("samadhi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const optional = s.decisions.at(-1)!.req;
    expect(optional.sourceCardId).toBe("BT8-102");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const firstTargetDecision = s.decisions.at(-1)!.req;
    const isOwnCostDecision = firstTargetDecision.options?.candidateInstanceIds?.includes(ownPermanentId) === true;
    if (isOwnCostDecision) {
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: firstTargetDecision.decisionId,
          response: { kind: "chooseTargets", instanceIds: [ownPermanentId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== firstTargetDecision.decisionId);
    }

    const targetDecision =
      s.decisions
        .filter(
          ({ req }) => req.kind === "chooseTargets" && req.options?.candidateInstanceIds?.includes(opponentTamerId),
        )
        .at(-1)?.req ?? s.decisions.at(-1)!.req;
    expect(new Set(targetDecision.options?.candidateInstanceIds)).toEqual(
      new Set([opponentDigimonId, opponentTamerId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [opponentTamerId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("climbmon").isSuspended &&
        s.perm("opponentTamer").isSuspended &&
        observe(s.engine).isRestricted(opponentTamerId, "unsuspend") &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("opponentDigimon").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(opponentTamerId, "unsuspend")).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(delayIsOnBoard()).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ownPermanentId,
        instanceId: s.inst("shivamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("climbmon").topCard.cardId === "BT8-057");
    await settle();
    expect(s.state.memory).toBe(0);
    expect(delayIsOnBoard()).toBe(true);

    s.state.phase = Phase.Active;
    await unsuspendForActivePhase(s);
    expect(delayIsOnBoard()).toBe(true);
    await settle(
      () =>
        !s.perm("climbmon").isSuspended &&
        s.perm("opponentDigimon").isSuspended &&
        s.state.players[1]!.security.length === 1,
    );
    expect(delayIsOnBoard()).toBe(true);

    await advance(s.engine).verb.suspend([ownPermanentId]);
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.turnCount += 1;
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(opponentTamerId, "unsuspend")).toBe(true);
    expect(delayIsOnBoard()).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("blockedOption").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("blockedOption").instanceId)).toBe(
      true,
    );
    expect(delayIsOnBoard()).toBe(true);

    await advance(s.engine).verb.unsuspend([opponentTamerId]);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(delayIsOnBoard()).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "activateEffect",
        sourceInstanceId: armedDelayInstanceId,
        effectKey: armedDelayEffectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === armedDelayInstanceId) && s.state.memory === 5,
    );

    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });
});
