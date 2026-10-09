/* oxlint-disable vitest/no-conditional-expect -- Table inputs select fixed contracts; branches never depend on observed game state. */
import { CardColor, GameState, Phase, type DecisionRequest, type Intent, type ServerEvent } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import "../../cards/index.js";
import { BotPlayer } from "../../bot/BotPlayer.js";
import { answerDecisionWith } from "../../bot/policy.js";
import { DEFAULT_BOT_PROFILE } from "../../bot/profiles.js";
import { GameEngine } from "../GameEngine.js";
import { definitionOf, matchingEvoCost } from "../cards/cardData.js";
import type { DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";

async function waitFor(predicate: () => boolean) {
  for (let tick = 0; tick < 1000 && !predicate(); tick += 1) await vi.advanceTimersByTimeAsync(50);
  expect(predicate()).toBe(true);
}

function playableScenario(scenario: DevScenarioId) {
  const state = new GameState();
  const events: ServerEvent[] = [];
  const decisions: DecisionRequest[] = [];
  const botIntents: Intent[] = [];
  const failures: unknown[] = [];
  let bot: BotPlayer | undefined;
  const engine = new GameEngine(state, {
    seed: 0x5eed,
    requestDecision: (seat, req) => {
      if (seat === 1) {
        bot?.onDecisionRequested(req);
        return;
      }
      decisions.push(req);
      queueMicrotask(() => {
        const intent = answerDecisionWith(undefined, req, DEFAULT_BOT_PROFILE);
        if (intent.type === "respondDecision" && intent.response.kind === "optional")
          intent.response.accept = req.sourceCardId === "BT25-089";
        if (
          intent.type === "respondDecision" &&
          (intent.response.kind === "selectCards" || intent.response.kind === "chooseTargets")
        )
          intent.response.instanceIds = (req.options?.candidateInstanceIds ?? []).slice(
            0,
            Math.max(1, req.options?.min ?? 0),
          );
        const result = engine.applyIntent(0, intent);
        if (!result.ok) failures.push({ intent, result });
      });
    },
    onActionSettled: (seat, type) => {
      if (seat === 1) bot?.onActionSettled(type);
    },
    emit: (event) => {
      events.push(event);
      bot?.onEvent(event);
    },
  });
  engine.seatPlayer(0, "deusmon-human", { displayName: "Human", deck: BLUE_DECK });
  engine.seatPlayer(1, "deusmon-bot", { displayName: "Bot", deck: RED_DECK });
  bot = new BotPlayer(
    1,
    state,
    (intent) => {
      botIntents.push(intent);
      const result = engine.applyIntent(1, intent);
      if (!result.ok) failures.push({ intent, result });
      return result;
    },
    { minThinkMs: 20, maxThinkMs: 20, clientPacesChains: true },
  );
  engine.startDevScenario(scenario);
  return { state, engine, events, decisions, botIntents, failures, bot };
}

function physicalState(s: ReturnType<typeof playableScenario>) {
  const player = s.state.players[0]!;
  const host = player.battleArea.find(({ permanentId }) => permanentId === "deusmon-sukamon-host")!;
  return {
    top: host.topCard.instanceId,
    linked: host.linked.map(({ instanceId }) => instanceId),
    stack: host.stack.map(({ instanceId }) => instanceId),
    hand: player.hand.map(({ instanceId }) => instanceId),
    deck: player.deck.map(({ instanceId }) => instanceId),
    trash: player.trash.map(({ instanceId }) => instanceId),
    memory: s.state.memory,
  };
}

const cases = [
  { scenario: "arena-deusmon-sukamon-app-fusion", rewritten: true, legal: false, effect: false },
  { scenario: "arena-deusmon-healthy-app-fusion", rewritten: false, legal: true, effect: false },
  { scenario: "arena-deusmon-reverse-app-fusion", rewritten: false, legal: true, effect: false },
  { scenario: "arena-deusmon-wrong-link-app-fusion", rewritten: false, legal: false, effect: false },
  { scenario: "arena-deusmon-sukamon-effect-fusion", rewritten: true, legal: false, effect: true },
  { scenario: "arena-deusmon-healthy-effect-fusion", rewritten: false, legal: true, effect: true },
] as const;

describe("Discord 1557555301014569070: human-controlled real-turn arena", () => {
  it.each([
    { scenario: "arena-deusmon-sukamon-app-fusion", indexed: false },
    { scenario: "arena-deusmon-sukamon-app-fusion", indexed: true },
    { scenario: "arena-deusmon-healthy-app-fusion", indexed: false },
    { scenario: "arena-deusmon-healthy-app-fusion", indexed: true },
    { scenario: "arena-deusmon-reverse-app-fusion", indexed: false },
    { scenario: "arena-deusmon-reverse-app-fusion", indexed: true },
  ] as const)("$scenario pays 5 for the rainbow Ult. badge (indexed=$indexed)", async ({ scenario, indexed }) => {
    vi.useFakeTimers();
    const s = playableScenario(scenario);
    try {
      await waitFor(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      // The existing bot has completed KingSukamon's real rewrite. Stop its next turn
      // so no subsequent bot action changes the paid control after effects settle.
      s.bot.dispose();
      const player = s.state.players[0]!;
      const host = player.battleArea.find(({ permanentId }) => permanentId === "deusmon-sukamon-host")!;
      const result = player.hand.find(({ instanceId }) => instanceId === "dev-deusmon-result")!;
      if (scenario === "arena-deusmon-sukamon-app-fusion") {
        expect(s.botIntents).toContainEqual({ type: "playCard", instanceId: "dev-deusmon-king" });
        expect(observe(s.engine).effectiveNames(host)).toEqual(["sukamon"]);
        expect(observe(s.engine).effectiveColors(host)).toEqual([CardColor.White]);
        expect(definitionOf(host.topCard).forms).toContain("Ult.");
        expect(matchingEvoCost("EX10-073", host.topCard.cardId, [CardColor.White])).toBeUndefined();
        expect(result.appFusionRoutes).toHaveLength(0);
        const beforeFusion = physicalState(s);
        expect(
          s.engine.applyIntent(0, {
            type: "appFusion",
            permanentId: host.permanentId,
            instanceId: result.instanceId,
            linkedInstanceId: "dev-deusmon-partner",
          }),
        ).toEqual({ ok: false, reason: "illegal-target" });
        expect(physicalState(s)).toEqual(beforeFusion);
      }
      const before = physicalState(s);
      expect(
        result.digivolveRoutes.some(
          (route) =>
            route.permanentId === host.permanentId &&
            route.projectedCost === 5 &&
            route.alternateRequirementIndex === (indexed ? 0 : -1),
        ),
      ).toBe(true);
      const outcome = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: result.instanceId,
        ...(indexed ? { alternateRequirementIndex: 0 } : {}),
      });
      expect(outcome).toEqual({ ok: true });
      await waitFor(() => host.topCard.cardId === "EX10-073" && s.state.pendingDecision === undefined);
      expect(s.events).toContainEqual({
        kind: "memoryChanged",
        from: before.memory,
        to: before.memory - 5,
        reason: "digivolve",
      });
      expect(s.state.memory).toBe(5 - before.memory);
      expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([before.top]);
      expect(host.linked.map(({ instanceId }) => instanceId)).toEqual(before.linked);
      expect(player.deck).toHaveLength(before.deck.length - 1);
      expect(s.events).toContainEqual(
        expect.objectContaining({
          kind: "digivolved",
          cardId: "EX10-073",
          mechanic: !indexed && scenario === "arena-deusmon-reverse-app-fusion" ? "normal" : "alternate",
        }),
      );
      expect(host.enteredByEffect).toBe(false);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.failures).toEqual([]);
    } finally {
      s.bot.dispose();
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      vi.useRealTimers();
    }
  });

  it.each(cases)(
    "$scenario uses the existing bot and public intents",
    async ({ scenario, rewritten, legal, effect }) => {
      vi.useFakeTimers();
      const s = playableScenario(scenario);
      try {
        await waitFor(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const player = s.state.players[0]!;
        const host = player.battleArea.find(({ permanentId }) => permanentId === "deusmon-sukamon-host")!;
        const result = player.hand.find(({ instanceId }) => instanceId === "dev-deusmon-result")!;
        if (rewritten) {
          expect(s.botIntents).toContainEqual({ type: "playCard", instanceId: "dev-deusmon-king" });
          expect(observe(s.engine).effectiveNames(host)).toEqual(["sukamon"]);
          expect(host.currentDP).toBe(4000);
        }
        expect(result.ownerSeat).toBe(0);
        expect(host.controllerSeat).toBe(0);
        expect(result.appFusionRoutes).toHaveLength(legal ? 1 : 0);
        const before = physicalState(s);
        if (effect) {
          expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
          await waitFor(
            () =>
              s.events.some(
                (event) =>
                  (event.kind === "effectResolved" || event.kind === "effectHadNoEffect") &&
                  event.sourceCardId === "BT25-089" &&
                  event.timing === "OnEndTurn",
              ) && s.state.pendingDecision === undefined,
          );
          if (!legal)
            expect(
              s.decisions.some(
                (req) =>
                  req.sourceCardId === "BT25-089" && req.options?.candidateInstanceIds?.includes(result.instanceId),
              ),
            ).toBe(false);
        } else {
          expect(
            s.engine.applyIntent(0, {
              type: "appFusion",
              permanentId: host.permanentId,
              instanceId: result.instanceId,
              linkedInstanceId: "dev-deusmon-partner",
            }),
          ).toEqual(legal ? { ok: true } : { ok: false, reason: "illegal-target" });
          if (legal) await waitFor(() => host.topCard.cardId === "EX10-073" && s.state.pendingDecision === undefined);
        }
        if (legal) {
          expect(host.topCard.cardId).toBe("EX10-073");
          expect(host.enteredByEffect).toBe(effect);
          expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([before.top, "dev-deusmon-partner"]);
          expect(host.linked).toHaveLength(0);
          expect(player.deck).toHaveLength(before.deck.length - 1);
          expect(player.trash.map(({ instanceId }) => instanceId)).toEqual(before.trash);
          if (!effect) expect(s.state.memory).toBe(before.memory);
        } else {
          const after = physicalState(s);
          // Passing changes the gauge and eventually expires the rewrite; no fusion material moves.
          expect({ ...after, memory: before.memory }).toEqual(before);
          expect(s.events.some((event) => event.kind === "digivolved" && event.cardId === "EX10-073")).toBe(false);
          if (!effect) expect(s.state.memory).toBe(before.memory);
        }
        expect(s.failures).toEqual([]);
      } finally {
        s.bot.dispose();
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
        vi.useRealTimers();
      }
    },
  );
});
