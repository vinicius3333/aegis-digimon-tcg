import { CloseCode, type Client } from "colyseus";
import type { GameState, Intent } from "@aegis/shared";
import { vi } from "vitest";
import { AegisRoom } from "../rooms/AegisRoom.js";
import { BotPlayer } from "../bot/BotPlayer.js";
import { addLogSink } from "../logger.js";
import { BLUE_DECK, RED_DECK, type Decklist } from "../engine/testDecks.js";
import type { GameEngine } from "../engine/GameEngine.js";
// Card effects must be registered, or a recorded match plays without them.
import "../cards/index.js";

/**
 * Plays a real {@link AegisRoom} match and keeps every log line the room wrote.
 *
 * Seat 0 is a person: a fake Colyseus client that joins through `onJoin`, sends `ready` and every
 * later intent through the room's own client path (`handleIntent`), chats, and can drop and come
 * back through `onLeave`. A {@link BotPlayer} decides its moves. Seat 1 is the room's own bot,
 * seated by `addBot`. Time is faked, so the bots' think delays and the room's timeouts (the
 * combat-window answer timeout included) elapse instantly but in their real order.
 */

export const HUMAN_NAME = "Replay Person";
export const HUMAN_SESSION = "session-replay-person";
export const CHAT_TEXT = "hello from the replay chat";

export interface RoomMatchOptions {
  seed: number;
  humanDeck?: Decklist;
  botDeck?: Decklist;
  turnLimit?: number;
  /** Leave the first combat prompt seat 0 is asked unanswered, so the room's timeout closes it. */
  ignoreFirstCombatPrompt?: boolean;
  /** Drop seat 0's connection at this turn and reconnect it a few seconds later. */
  dropAtTurn?: number;
  /** Seat 0 leaves for good (a consented leave) at this turn. */
  leaveAtTurn?: number;
}

export interface RecordedRoomMatch {
  lines: string[];
  matchId: string;
  /** {@link comparableState} of the room's state once the match ended and the engine went idle. */
  finalState: unknown;
  turnCount: number;
  gameOver: boolean;
}

const COMBAT_ANSWERS = new Set<Intent["type"]>([
  "declareBlock",
  "declineBlock",
  "respondCounter",
  "respondAlliance",
  "respondEvade",
  "respondBarrier",
]);

function macrotask(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

function fakeClient(sessionId: string): Client {
  return { sessionId, send: vi.fn<() => void>(), view: undefined } as unknown as Client;
}

type RoomInternals = {
  engine: GameEngine;
  bots: (BotPlayer | undefined)[];
  handleIntent(client: Client, intent: Intent): void;
  handleChat(client: Client, payload: unknown): void;
};

export async function recordRoomMatch(options: RoomMatchOptions): Promise<RecordedRoomMatch> {
  const lines: string[] = [];
  const stopCapture = addLogSink((line) => lines.push(line));
  // Timers and clocks are fake; `setImmediate` and the microtask queue stay real. Every fake timer
  // is fired on its own, after a real macrotask turn has drained all pending promise work, as in
  // Node. (`advanceTimersByTimeAsync` can fire a timer while a deep promise chain is still
  // resolving, which no real timer can do, and would record inputs at impossible moments.)
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"],
  });
  const room = new AegisRoom();
  const internals = room as unknown as RoomInternals;
  try {
    room.lock = vi.fn<() => Promise<void>>(async () => {});
    room.unlock = vi.fn<() => Promise<void>>(async () => {});
    room.setMatchmaking = vi.fn<() => Promise<void>>(async () => {});
    room.broadcast = vi.fn<() => boolean>(() => true) as AegisRoom["broadcast"];
    room.onCreate({ botRoom: true, seed: options.seed });

    const human = fakeClient(HUMAN_SESSION);
    room.clients.push(human);
    room.onJoin(human, {
      displayName: HUMAN_NAME,
      deck: options.humanDeck ?? RED_DECK,
      botDeck: options.botDeck ?? BLUE_DECK,
    });
    internals.handleIntent(human, { type: "ready" });
    internals.handleChat(human, { kind: "text", text: CHAT_TEXT });

    let ignored = !options.ignoreFirstCombatPrompt;
    internals.bots[0] = new BotPlayer(
      0,
      room.state,
      (intent) => {
        if (!ignored && COMBAT_ANSWERS.has(intent.type) && room.state.combatWindow?.seat === 0) {
          ignored = true;
          return;
        }
        internals.handleIntent(human, intent);
      },
      { seed: options.seed },
    );
    if (!room.addBot()) throw new Error("the room refused the bot");

    const turnLimit = options.turnLimit ?? 40;
    let dropped = options.dropAtTurn === undefined;
    let left = options.leaveAtTurn === undefined;
    const departures: Promise<void>[] = [];
    let unsettledDepartures = 0;
    const depart = (departure: Promise<void>) => {
      unsettledDepartures += 1;
      departures.push(departure.finally(() => (unsettledDepartures -= 1)));
    };
    const advance = async () => {
      await macrotask();
      if (vi.getTimerCount() > 0) vi.advanceTimersToNextTimer();
      else vi.advanceTimersByTime(1_000);
      room.clock.tick();
    };
    for (let step = 0; step < 100_000 && !room.state.gameOver && room.state.turnCount <= turnLimit; step++) {
      if (!dropped && room.state.turnCount >= options.dropAtTurn!) {
        dropped = true;
        room.allowReconnection = vi.fn<() => Promise<Client>>(
          () => new Promise<Client>((resolve) => setTimeout(() => resolve(fakeClient(HUMAN_SESSION)), 3_000)),
        ) as unknown as AegisRoom["allowReconnection"];
        depart(room.onLeave(human, CloseCode.ABNORMAL_CLOSURE));
      }
      if (!left && room.state.turnCount >= options.leaveAtTurn!) {
        left = true;
        depart(room.onLeave(human, CloseCode.CONSENTED));
      }
      await advance();
    }
    // A reconnection still pending (its grace timer) settles on fake time like everything else.
    for (let step = 0; step < 1_000; step++) {
      if (unsettledDepartures === 0) break;
      await advance();
    }
    await Promise.all(departures);
    for (const bot of internals.bots) bot?.dispose();
    // Let whatever the last input started finish, as the replay will before comparing.
    await macrotask();
    internals.engine.syncCounts();
    return {
      lines,
      matchId: room.state.matchLogId,
      finalState: comparableState(room.state),
      turnCount: room.state.turnCount,
      gameOver: room.state.gameOver,
    };
  } finally {
    room.onDispose();
    room.clock.stop();
    stopCapture();
    vi.useRealTimers();
  }
}

/**
 * The engine-owned part of a state, for comparing a replay with the room it reproduces. What the
 * room alone writes (identities, codes, the match clock, the series) is left out; `stateVersion`
 * stays, because the replay reproduces the room's batch bookkeeping.
 */
export function comparableState(state: GameState): unknown {
  const json = structuredClone(state.toJSON()) as Record<string, unknown>;
  for (const key of [
    "matchLogId",
    "matchId",
    "roomCode",
    "spectatorCode",
    "matchTimer",
    "timerStartSeconds",
    "timerRefillSeconds",
    "timerRemaining0",
    "timerRemaining1",
    "timerActiveSeat",
    "series",
  ])
    delete json[key];
  for (const player of (json.players as Record<string, unknown>[] | undefined) ?? []) {
    delete player.sessionId;
    delete player.displayName;
    delete player.avatarId;
  }
  return json;
}
