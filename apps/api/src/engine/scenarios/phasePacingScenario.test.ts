import {
  CardKind,
  GameState,
  PHASE_PACING_SCENARIOS,
  Phase,
  getCardDefinition,
  type Intent,
  type ServerEvent,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import "../../cards/index.js";
import { BotPlayer } from "../../bot/BotPlayer.js";
import { GameEngine } from "../GameEngine.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
async function waitFor(predicate: () => boolean) {
  for (let tick = 0; tick < 800 && !predicate(); tick++) await vi.advanceTimersByTimeAsync(50);
  expect(predicate()).toBe(true);
}

function expectConserved(state: GameState) {
  for (const player of state.players) {
    const all = [
      ...player.deck,
      ...player.hand,
      ...player.security,
      ...player.trash,
      ...player.eggDeck,
      ...[...player.battleArea, ...(player.breeding ? [player.breeding] : [])].flatMap((p) => [
        p.topCard,
        ...p.stack,
        ...p.linked,
      ]),
    ];
    const main = all.filter((card) => !getCardDefinition(card.cardId)?.kinds.includes(CardKind.DigiEgg));
    expect(main).toHaveLength(50);
    expect(all).toHaveLength(54);
    expect(new Set(all.map((card) => card.instanceId)).size).toBe(54);
    const copies = new Map<string, number>();
    for (const card of all) copies.set(card.cardId, (copies.get(card.cardId) ?? 0) + 1);
    expect([...copies.values()].every((count) => count <= 4)).toBe(true);
  }
}

describe("real autonomous phase pacing boards", () => {
  for (const scenario of PHASE_PACING_SCENARIOS) {
    it(`${scenario.id} completes ordinary bot actions with conserved physical cards`, async () => {
      vi.useFakeTimers();
      const state = new GameState();
      const events: ServerEvent[] = [];
      const intents: Intent[] = [];
      const failures: unknown[] = [];
      let bot: BotPlayer | undefined;
      const engine = new GameEngine(state, {
        seed: 0x5eed,
        requestDecision: (seat, request) => {
          if (seat === 1) bot?.onDecisionRequested(request);
        },
        onActionSettled: (seat, type) => {
          if (seat === 1) bot?.onActionSettled(type);
        },
        emit: (event) => {
          events.push(event);
          bot?.onEvent(event);
        },
      });
      engine.seatPlayer(0, "phase-human", { displayName: "Human", deck: BLUE_DECK });
      engine.seatPlayer(1, "phase-bot", { displayName: "Bot", deck: RED_DECK });
      bot = new BotPlayer(
        1,
        state,
        (intent) => {
          intents.push(intent);
          const result = engine.applyIntent(1, intent);
          if (!result.ok) failures.push({ intent, result });
          return result;
        },
        {
          clientPacesChains: true,
          minThinkMs: 20,
          maxThinkMs: 20,
        },
      );
      try {
        engine.startDevScenario(scenario.id);
        await waitFor(() => state.phase === Phase.Breeding && state.turnSeat === 0);
        expectConserved(state);
        const controls = state.players.map((player) => player.battleArea[0]!.topCard.instanceId);
        const raisingId = state.players[1]!.breeding?.permanentId;
        expect(engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await waitFor(() => state.phase === Phase.Main && state.turnSeat === 0);
        const turn = state.turnCount;
        expect(engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        const returned = () => state.turnSeat === 0 && state.turnCount === turn + 2 && state.phase === Phase.Breeding;
        for (let tick = 0; tick < 800 && !returned(); tick++) await vi.advanceTimersByTimeAsync(50);
        expect(returned(), JSON.stringify(intents)).toBe(true);
        expectConserved(state);
        expect(failures).toEqual([]);
        expect(state.players.map((player) => player.battleArea[0]!.topCard.instanceId)).toEqual(controls);
        expect(state.players[0]!.security.length).toBe(4 - scenario.securityRemoved);
        const attacks = events.filter(
          (event): event is Extract<ServerEvent, { kind: "attackDeclared" }> =>
            event.kind === "attackDeclared" && event.seat === 1,
        );
        expect(attacks).toHaveLength(scenario.securityRemoved);
        if (scenario.flow === "raising-evolution") {
          expect(intents.filter((intent) => intent.type === "digivolve")).toHaveLength(3);
          expect(intents.some((intent) => intent.type === "playCard")).toBe(false);
          const raised = state.players[1]!.breeding!;
          expect(raised.permanentId).toBe(raisingId);
          expect([...raised.stack, raised.topCard].map((card) => card.cardId)).toEqual([
            "ST1-01",
            ...scenario.handCardIds,
          ]);
          expect(events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "ST1-08")).toEqual(
            [],
          );
          expect(state.players[1]!.hand.map((card) => card.cardId)).toEqual(Array<string>(4).fill("ST2-16"));
        } else if (scenario.flow === "play-grouping") {
          const played = events.filter(
            (event): event is Extract<ServerEvent, { kind: "cardPlayed" }> =>
              event.kind === "cardPlayed" && event.seat === 1,
          );
          expect(played.map((event) => event.cardId)).toEqual(scenario.handCardIds);
          expect(new Set(played.map((event) => event.permanentId)).size).toBe(2);
          expect(state.players[1]!.battleArea.filter((p) => p.topCard.cardId === "ST1-12")).toHaveLength(2);
          expect(getCardDefinition("ST1-12")?.kinds).toContain(CardKind.Tamer);
          expect(state.players[1]!.breeding!.topCard.cardId).toBe("BT1-007");
        } else {
          expect(intents.filter((intent) => intent.type === "moveFromBreeding")).toEqual([
            { type: "moveFromBreeding", permanentId: raisingId },
          ]);
          expect(state.players[1]!.breeding).toBeUndefined();
          expect(intents.filter((intent) => intent.type === "digivolve")).toHaveLength(1);
          expect(events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST1-08")).toBe(true);
          expect(state.players[1]!.battleArea.find((p) => p.permanentId === raisingId)).toBeDefined();
          expect(state.players[1]!.battleArea.filter((p) => p.topCard.cardId === "ST1-05")).toHaveLength(2);
          expect(new Set(attacks.map((event) => event.attackerPermanentId)).size).toBe(3);
        }
      } finally {
        bot.dispose();
        engine.applyIntent(0, { type: "surrender" });
        vi.useRealTimers();
      }
    });
  }
});
