import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it.each([0, 1])("#5332 live arena pays Tamer %s and completes the inherited attack", async (payer) => {
  const options = { autoDeclineOptional: true };
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layDevScenario("arena-github5332-kekkomon-cost", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    options.autoDeclineOptional = false;
    const human = s.state.players[0]!;
    const attacker = human.battleArea[0]!;
    const tamers = [...human.battleArea].slice(2);
    expect(tamers.map((tamer) => tamer.isSuspended)).toEqual([false, false]);
    const helper = human.battleArea[1]!;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: helper.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    const helperDecisions: string[] = [];
    for (let step = 0; step < 12; step += 1) {
      await settle(
        () => s.state.pendingDecision !== undefined || s.events.some((event) => event.kind === "attackEnded"),
      );
      if (!s.state.pendingDecision) break;
      const req = s.decisions.at(-1)!.req;
      helperDecisions.push(`${req.kind}/${req.sourceCardId}/${req.options?.purpose ?? "payload"}`);
      const response =
        req.kind === "optional"
          ? {
              kind: "optional" as const,
              accept: req.sourceCardId !== "ST23-01" || req.options?.activationConfirmation === true,
            }
          : req.kind === "selectCards" || req.kind === "chooseTargets"
            ? {
                kind: req.kind,
                instanceIds: [req.options?.purpose === "cost" ? tamers[0]!.topCard.instanceId : helper.permanentId],
              }
            : { kind: "chooseOption" as const, optionIndex: 0 };
      expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: req.decisionId, response })).toEqual({
        ok: true,
      });
    }
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined);
    expect(tamers.map((tamer) => tamer.isSuspended)).toEqual([true, true]);
    expect(helperDecisions).toEqual([
      "optional/ST23-01/payload",
      "selectCards/ST23-01/cost",
      "optional/ST23-01/payload",
      "optional/ST23-13/payload",
      "chooseTargets/ST23-13/payload",
      "optional/BT25-090/payload",
    ]);
    expect(helper.currentDP).toBe(5000);
    expect(helper.topCard.cardId).toBe("ST23-02");
    expect(tamers.map((tamer) => tamer.stack.length)).toEqual([1, 4]);
    const paymentId = tamers[payer]!.stack[0]!.instanceId;
    expect(tamers[payer]!.stack[0]!.faceUp).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const consent = s.decisions.at(-1)!.req;
    expect(consent.sourceCardId).toBe("ST23-01");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: consent.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.at(-1)?.req.options?.purpose === "cost");
    const cost = s.decisions.at(-1)!.req;
    expect(cost.options?.candidateInstanceIds).toEqual(tamers.map((tamer) => tamer.topCard.instanceId));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "selectCards", instanceIds: [tamers[payer]!.topCard.instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const evolutionConsent = s.decisions.at(-1)!.req;
    expect(evolutionConsent.sourceCardId).toBe("ST23-01");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolutionConsent.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const evolution = s.decisions.at(-1)!.req;
    expect(evolution.options?.candidateInstanceIds).toEqual(["dev-5332-evolution-0", "dev-5332-evolution-1"]);
    options.autoDeclineOptional = true;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolution.decisionId,
        response: { kind: "selectCards", instanceIds: ["dev-5332-evolution-0"] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && s.state.pendingDecision === undefined);
    expect(attacker.topCard.cardId).toBe("ST23-07");
    expect(tamers.map((tamer) => tamer.stack.length)).toEqual(payer === 0 ? [0, 4] : [1, 3]);
    expect(human.trash.some((card) => card.instanceId === paymentId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(10);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
