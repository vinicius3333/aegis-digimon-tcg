import { afterEach, describe, it, expect, vi } from "vitest";
import type { Client } from "colyseus";
import { Encoder } from "@colyseus/schema";
import {
  ALL_FAMOUS_DECKS,
  DECISION_CHANNEL,
  EVENT_CHANNEL,
  isFamousDeckAvailable,
  type SequencedServerEvent,
  type ServerEvent,
} from "@aegis/shared";
import { AegisRoom } from "./AegisRoom.js";
import { RED_DECK } from "../engine/testDecks.js";
import { DEFAULT_MAX_ACTION_DELAY_MS } from "../bot/BotPlayer.js";

/**
 * Room-level coverage for the ready-gated match start (subsystem:
 * intent-protocol-and-room). AegisRoom is instantiated directly and driven through
 * its lifecycle hooks, bypassing the Colyseus matchmaker/transport — the same
 * pattern the framework itself uses internally (it pushes the client into
 * `room.clients` before invoking `onJoin`). `broadcast` is stubbed so assertions can
 * inspect emitted events without decoding the wire protocol.
 */

const EMPTY_DECK = { mainDeck: [], eggDeck: [] };

function fakeClient(sessionId: string): Client {
  return { sessionId, send: vi.fn(), view: undefined } as unknown as Client;
}

type BroadcastCall = [string, unknown, { afterNextPatch?: boolean } | undefined];

function makeRoom(options: { botRoom?: boolean; seed?: number } = {}): AegisRoom {
  const room = new AegisRoom();
  const broadcastCalls: BroadcastCall[] = [];
  room.broadcast = vi.fn((type: string, message: unknown, broadcastOptions?: { afterNextPatch?: boolean }) => {
    broadcastCalls.push([type, message, broadcastOptions]);
    return true;
  }) as AegisRoom["broadcast"];
  (room as unknown as { broadcastCalls: BroadcastCall[] }).broadcastCalls = broadcastCalls;
  room.onCreate({ seed: options.seed ?? 1, ...options });
  return room;
}

function recordedBroadcasts(room: AegisRoom): BroadcastCall[] {
  return (room as unknown as { broadcastCalls: BroadcastCall[] }).broadcastCalls;
}

function broadcastedEvents(room: AegisRoom): ServerEvent[] {
  return recordedBroadcasts(room)
    .filter(([type]) => type === EVENT_CHANNEL)
    .map(([, event]) => event as ServerEvent);
}

/** Everything the room put on the event channel, envelope included. */
function sequencedEvents(room: AegisRoom): SequencedServerEvent[] {
  return broadcastedEvents(room) as SequencedServerEvent[];
}

function intentSender(room: AegisRoom): (client: Client, intent: { type: string }) => void {
  return (room as unknown as { handleIntent: (c: Client, i: { type: string }) => void }).handleIntent.bind(room);
}

function joinBothSeats(room: AegisRoom): [Client, Client] {
  const a = fakeClient("session-a");
  const b = fakeClient("session-b");
  room.clients.push(a);
  room.onJoin(a, { displayName: "A", deck: EMPTY_DECK });
  room.clients.push(b);
  room.onJoin(b, { displayName: "B", deck: EMPTY_DECK });
  return [a, b];
}

describe("AegisRoom ready-gated match start", () => {
  afterEach(() => vi.useRealTimers());

  it("rejects duplicate nicknames in the same room case-insensitively", async () => {
    const room = makeRoom();
    const first = fakeClient("first-name");
    const second = fakeClient("second-name");
    const firstOptions = { displayName: "Tamer", deck: EMPTY_DECK };
    expect(await room.onAuth(first, firstOptions)).toBe(true);
    room.clients.push(first);
    room.onJoin(first, firstOptions);
    expect(await room.onAuth(second, { displayName: "tAMER", deck: EMPTY_DECK })).toBe(false);
  });

  it("does not start the match after both seats join without ready", () => {
    const room = makeRoom();
    joinBothSeats(room);
    expect(broadcastedEvents(room).some((e) => e.kind === "matchStarted")).toBe(false);
  });

  it("starts the match once both seats send ready", () => {
    const room = makeRoom();
    const [a, b] = joinBothSeats(room);
    const handleIntent = (
      room as unknown as {
        handleIntent: (c: Client, i: { type: string }) => void;
      }
    ).handleIntent.bind(room);

    handleIntent(a, { type: "ready" });
    expect(broadcastedEvents(room).some((e) => e.kind === "matchStarted")).toBe(false);

    handleIntent(b, { type: "ready" });
    expect(broadcastedEvents(room).some((e) => e.kind === "matchStarted")).toBe(true);
  });

  it("the ready-timeout fallback and the ready gate are idempotent together", () => {
    const room = makeRoom();
    joinBothSeats(room);
    const startMatchSpy = vi.spyOn((room as unknown as { engine: { startMatch: () => void } }).engine, "startMatch");

    (room as unknown as { startMatchNow: () => void }).startMatchNow();
    (room as unknown as { startMatchNow: () => void }).startMatchNow();

    expect(startMatchSpy).toHaveBeenCalledTimes(1);
  });

  it("addBot seats a bot in a dedicated bot room and starts without waiting for ready", () => {
    const room = makeRoom({ botRoom: true });
    // Production attaches the room state to an Encoder before clients join. Keep
    // this test on that real StateView lifecycle so detached schema nodes crash it.
    // eslint-disable-next-line no-new -- constructing the Encoder wires the state root
    new Encoder(room.state);
    const human = fakeClient("session-human");
    room.clients.push(human);
    room.onJoin(human, { displayName: "Human", deck: RED_DECK });

    room.addBot();

    expect(broadcastedEvents(room).some((e) => e.kind === "matchStarted")).toBe(true);
  });

  it("addBot deals the bot the requested famous-deck preset", () => {
    const requested = ALL_FAMOUS_DECKS.find(isFamousDeckAvailable);
    expect(requested).toBeDefined();
    const room = makeRoom({ botRoom: true });
    // eslint-disable-next-line no-new -- constructing the Encoder wires the state root
    new Encoder(room.state);
    const human = fakeClient("session-human-deck");
    room.clients.push(human);
    room.onJoin(human, { displayName: "Human", deck: RED_DECK });

    room.addBot(requested!.deckId);

    // The match has started and dealt, so the preset's 50 cards are spread over the
    // bot's zones; the total is what proves WHICH deck was seated.
    const bot = room.state.players[1]!;
    const dealtTotal = bot.deck.length + bot.hand.length + bot.security.length;
    expect(dealtTotal).toBe(requested!.decklist.mainDeck.length);
    expect(bot.eggDeck.length).toBe(requested!.decklist.eggDeck.length);
    const dealtIds = [...bot.deck, ...bot.hand, ...bot.security].map((card) => card.cardId).sort();
    expect(dealtIds).toEqual([...requested!.decklist.mainDeck].sort());
  });

  it("advances past mulligan after the human keeps and the bot answers", async () => {
    vi.useFakeTimers();
    const room = makeRoom({ botRoom: true, seed: 2 });
    // eslint-disable-next-line no-new -- constructing the Encoder wires the state root
    new Encoder(room.state);
    const human = fakeClient("session-human-mulligan");
    room.clients.push(human);
    room.onJoin(human, { displayName: "Human", deck: RED_DECK });
    room.addBot();

    expect(room.state.pendingDecision).toMatchObject({ seat: 0, kind: "mulligan" });
    const handleIntent = (
      room as unknown as {
        handleIntent: (client: Client, intent: { type: "mulligan"; keep: boolean }) => void;
      }
    ).handleIntent.bind(room);
    handleIntent(human, { type: "mulligan", keep: true });
    await Promise.resolve();
    expect(room.state.pendingDecision).toMatchObject({ seat: 1, kind: "mulligan" });

    // Past the ceiling of the bot's think-time window, wherever in it this seed lands.
    await vi.advanceTimersByTimeAsync(DEFAULT_MAX_ACTION_DELAY_MS);

    expect(room.state.pendingDecision).toBeUndefined();
    expect(room.state.turnCount).toBe(1);
  });

  it("keeps casual bot seating compatible with web bundles loaded before the rollout", () => {
    const room = makeRoom();
    const human = fakeClient("session-human");
    room.clients.push(human);
    room.onJoin(human, { displayName: "Human", deck: EMPTY_DECK });

    expect(room.addBot()).toBe(true);
    expect(broadcastedEvents(room).some((event) => event.kind === "matchStarted")).toBe(true);
  });

  it("limits dedicated bot rooms to one human client", () => {
    const room = makeRoom({ botRoom: true });

    expect(room.maxClients).toBe(1);
  });

  it("reseats a fresh queued player instead of retaining the departed identity", async () => {
    const room = makeRoom();
    const departed = fakeClient("departed");
    room.clients.push(departed);
    room.onJoin(departed, { displayName: "Departed", deck: EMPTY_DECK });
    room.clients.splice(0, 1);
    await room.onLeave(departed, true);

    const replacement = fakeClient("replacement");
    room.clients.push(replacement);
    room.onJoin(replacement, { displayName: "Replacement", deck: EMPTY_DECK });

    expect(room.state.players[0]?.sessionId).toBe("replacement");
    expect(room.state.players[0]?.displayName).toBe("Replacement");
  });

  it("requires a replacement player to send their own ready intent", async () => {
    const room = makeRoom();
    const [departed, opponent] = joinBothSeats(room);
    const handleIntent = (
      room as unknown as { handleIntent: (client: Client, intent: { type: string }) => void }
    ).handleIntent.bind(room);
    handleIntent(departed, { type: "ready" });
    room.clients.splice(0, 1);
    await room.onLeave(departed, true);
    const replacement = fakeClient("replacement-ready");
    room.clients.push(replacement);
    room.onJoin(replacement, { displayName: "Replacement", deck: EMPTY_DECK });

    handleIntent(opponent, { type: "ready" });
    expect(broadcastedEvents(room).some((event) => event.kind === "matchStarted")).toBe(false);
    handleIntent(replacement, { type: "ready" });
    expect(broadcastedEvents(room).some((event) => event.kind === "matchStarted")).toBe(true);
  });
});

/**
 * The presentation stream contract (docs/presentation-queue-plan.md section 3.1): every event
 * carries its position in the room's stream and the batch the rules produced it in, and each
 * batch that said anything is ended by exactly one `batchClosed`.
 */
describe("AegisRoom sequenced event batches", () => {
  afterEach(() => vi.useRealTimers());

  function startedBotRoom(): { room: AegisRoom; human: Client } {
    const room = makeRoom({ botRoom: true, seed: 2 });
    // eslint-disable-next-line no-new -- constructing the Encoder wires the state root
    new Encoder(room.state);
    const human = fakeClient("session-human-batches");
    room.clients.push(human);
    room.onJoin(human, { displayName: "Human", deck: RED_DECK });
    room.addBot();
    return { room, human };
  }

  it("numbers every broadcast event monotonically with no gaps", () => {
    const { room } = startedBotRoom();
    const seqs = sequencedEvents(room).map((event) => event.seq);

    expect(seqs.length).toBeGreaterThan(1);
    expect(seqs).toEqual(seqs.map((_, index) => index + 1));
  });

  it("stamps every event with the batch it was emitted in", () => {
    const { room } = startedBotRoom();

    for (const event of sequencedEvents(room)) {
      expect(typeof event.batch).toBe("string");
      expect(event.batch).not.toBe("");
      expect(typeof event.stateVersion).toBe("number");
    }
  });

  it("closes each batch that emitted events exactly once, after the state patch", () => {
    const { room } = startedBotRoom();
    const events = sequencedEvents(room);
    const batchesWithEvents = new Set(events.filter((event) => event.kind !== "batchClosed").map((e) => e.batch));
    const closes = events.filter((event) => event.kind === "batchClosed");

    expect(closes.map((close) => close.kind === "batchClosed" && close.batch).sort()).toEqual(
      [...batchesWithEvents].sort(),
    );
    const closeOptions = recordedBroadcasts(room)
      .filter(([type, message]) => type === EVENT_CHANNEL && (message as ServerEvent).kind === "batchClosed")
      .map(([, , options]) => options?.afterNextPatch);
    expect(closeOptions.every((afterNextPatch) => afterNextPatch === true)).toBe(true);
  });

  it("names the last event of the batch in its close", () => {
    const { room } = startedBotRoom();
    const events = sequencedEvents(room);

    for (const close of events) {
      if (close.kind !== "batchClosed") continue;
      const inBatch = events.filter((event) => event.batch === close.batch && event.kind !== "batchClosed");
      expect(close.lastSeq).toBe(inBatch.at(-1)!.seq);
    }
  });

  it("reuses the open batch for an entry nested inside it", () => {
    const room = makeRoom();
    const [a, b] = joinBothSeats(room);
    const handleIntent = intentSender(room);

    handleIntent(a, { type: "ready" });
    const before = sequencedEvents(room).length;
    // The second `ready` closes the gate, so the engine starts the match from inside this
    // intent: one entry nested in another must not split the moment into two batches.
    handleIntent(b, { type: "ready" });

    const started = sequencedEvents(room).slice(before);
    const batches = new Set(started.map((event) => event.batch));
    expect(started.some((event) => event.kind === "matchStarted")).toBe(true);
    expect(batches.size).toBe(1);
    expect(started.filter((event) => event.kind === "batchClosed")).toHaveLength(1);
  });

  it("closes a batch on the state revision the batch produced", () => {
    const room = makeRoom();
    const [a, b] = joinBothSeats(room);
    const handleIntent = intentSender(room);
    handleIntent(a, { type: "ready" });
    handleIntent(b, { type: "ready" });

    const closes = sequencedEvents(room).filter((event) => event.kind === "batchClosed");
    expect(closes.length).toBeGreaterThan(0);
    const last = closes.at(-1)!;
    expect(last.kind === "batchClosed" && last.stateVersion).toBe(room.state.stateVersion);
    // Each close raises the revision by one, so a client can pair a patch with a batch.
    expect(room.state.stateVersion).toBe(closes.length);
  });

  it("stamps a rejection and gives it a batch of its own", () => {
    const room = makeRoom();
    const [a] = joinBothSeats(room);
    const handleIntent = intentSender(room);

    handleIntent(a, { type: "playCard", instanceId: "not-a-card" } as { type: string });

    const sent = (a.send as unknown as { mock: { calls: [string, unknown][] } }).mock.calls.filter(
      ([channel]) => channel === EVENT_CHANNEL,
    );
    const rejection = sent
      .map(([, message]) => message as SequencedServerEvent)
      .find((e) => e.kind === "actionRejected");
    expect(rejection).toBeDefined();
    expect(rejection!.seq).toBeGreaterThan(0);
    expect(rejection!.batch).not.toBe("");
    // The refusal is nobody else's business, and it changed no state to patch.
    expect(broadcastedEvents(room).some((event) => event.kind === "actionRejected")).toBe(false);
    const close = sent
      .map(([, message]) => message as SequencedServerEvent)
      .find((event) => event.kind === "batchClosed");
    expect(close).toBeDefined();
    expect(close!.batch).toBe(rejection!.batch);
  });

  it("stamps a decision with the revision the board will be at when it is asked", () => {
    const room = makeRoom();
    const [a] = joinBothSeats(room);
    const request = { decisionId: "dec-1", seat: 0 as const, kind: "optional" as const, promptText: "Activate?" };
    const ask = (room as unknown as { requestDecision: (seat: 0 | 1, req: typeof request) => void }).requestDecision;
    const sentDecisions = () =>
      (a.send as unknown as { mock: { calls: [string, { stateVersion?: number }][] } }).mock.calls
        .filter(([channel]) => channel === DECISION_CHANNEL)
        .map(([, message]) => message);

    // Raised inside a batch: that batch has not closed yet, so the answer belongs to the
    // revision its close will produce.
    const withinBatch = (room as unknown as { withBatch: <T>(run: () => T) => T }).withBatch.bind(room);
    const before = room.state.stateVersion;
    withinBatch(() => {
      (room as unknown as { stamp: (e: ServerEvent) => unknown }).stamp({ kind: "matchStarted", firstSeat: 0 });
      ask.call(room, 0, request);
    });
    expect(sentDecisions().at(-1)?.stateVersion).toBe(before + 1);

    // Raised with nothing open: the board is already at the revision the question is about.
    ask.call(room, 0, { ...request, decisionId: "dec-2" });
    expect(sentDecisions().at(-1)?.stateVersion).toBe(room.state.stateVersion);
  });
});
