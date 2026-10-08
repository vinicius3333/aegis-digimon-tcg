import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/BT17/BT17-078.js";
import "../cards/BT5/BT5-031.js";
import "../cards/AD1/AD1-004.js";
import "../cards/AD1/AD1-014.js";
import "../cards/BT10/BT10-008.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, drainMicrotasks } from "./testkit/harness.js";

it.each([false, true])(
  "GH5346 arena hands off Counter to normal effect targets (skip return %s)",
  async (skipReturn) => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layDevScenario("arena-github-5346-blast-dna-decision", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      const attacker = s.state.players[1]!.battleArea[0]!;
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await drainMicrotasks(500);
      if (s.engine.combat.hasOpenBlockWindow)
        expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
      await settle(() => s.state.combatWindow?.kind === "counter");
      const choices = JSON.parse(s.state.combatWindow!.eligibleCountersJson) as {
        instanceId: string;
        effectKey: string;
      }[];
      expect(choices).toHaveLength(3);
      const choice = choices.find((c) => c.effectKey.includes('"github-5346-metal-b"'))!;
      const intent = {
        type: "respondCounter" as const,
        sourceInstanceId: choice.instanceId,
        effectKey: choice.effectKey,
      };
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision !== undefined);
      expect(s.engine.applyIntent(0, intent)).toEqual({ ok: false, reason: "decision-pending" });
      const first = s.decisions.at(-1)!.req;
      expect(first.sourceCardId).toBe("BT17-078");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: first.decisionId,
          response: { kind: "chooseTargets", instanceIds: skipReturn ? [] : [attacker.permanentId] },
        }),
      ).toEqual({ ok: true });
      await settle(() => !s.engine.counterResolutionInFlight && !s.state.pendingDecision);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      // With one legal mandatory deletion target, the engine resolves it automatically.
      const destination = skipReturn ? s.state.players[1]!.trash : s.state.players[1]!.deck;
      expect(destination.some((card) => card.instanceId === attacker.topCard.instanceId)).toBe(true);
      expect(s.events.filter((e) => e.kind === "counterResolved")).toEqual([
        expect.objectContaining({ activated: true }),
      ]);
      expect(s.engine.applyIntent(0, intent).ok).toBe(false);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  },
);
