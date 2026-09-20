import { Decoder, Encoder } from "@colyseus/schema";
import { CardInstance, GameState, Permanent, Phase, PlayerState, type Seat, type ServerEvent } from "@aegis/shared";
import { GameEngine } from "../../engine/GameEngine.js";
import { buildStateView } from "../../engine/state/visibility.js";
import { exportStoppedMainBoundary, importStoppedMainBoundary, roomHandoffExperimentEnabled } from "./experiment.js";
import "../../cards/index.js";

interface WorkerResult {
  readonly pid: number;
  readonly clientState: readonly ClientStateSummary[];
  readonly privateState: readonly PrivateStateSummary[];
  readonly game: GameResult;
}

interface ClientStateSummary {
  readonly seat: Seat;
  readonly ownHand: readonly string[];
  readonly opponentHandCount: number;
  readonly visibleDeckCount: number;
  readonly visibleDeckCardCount: number;
  readonly ownSecurityCount: number;
}

interface PrivateStateSummary {
  readonly seat: Seat;
  readonly hand: readonly string[];
  readonly deck: readonly string[];
  readonly eggDeck: readonly string[];
  readonly security: readonly string[];
  readonly nextDrawInstanceId: string | undefined;
}

interface GameResult {
  readonly accepted: boolean;
  readonly gameOver: boolean;
  readonly winnerSeat: number;
  readonly events: readonly string[];
}

async function main(): Promise<void> {
  if (!roomHandoffExperimentEnabled()) {
    throw new Error("room handoff process proof is disabled (set NODE_ENV=test and the experiment flag)");
  }

  const mode = process.argv[2];
  if (mode === "origin") {
    const { state } = createBoundaryMatch();
    const snapshot = exportStoppedMainBoundary(state);
    const uninterrupted = importStoppedMainBoundary(snapshot);
    const events: ServerEvent[] = [];
    const engine = createEngine(uninterrupted, events);
    const clientState = encodeClientStates(uninterrupted);
    const privateState = summarizePrivateState(uninterrupted);
    const game = await continueToResult(engine, events);
    writeResult({ pid: process.pid, clientState, privateState, game, snapshot });
    return;
  }

  if (mode === "destination") {
    const snapshotText = await readStdin();
    const snapshot = JSON.parse(snapshotText) as Parameters<typeof importStoppedMainBoundary>[0];
    const state = importStoppedMainBoundary(snapshot);
    const events: ServerEvent[] = [];
    const engine = createEngine(state, events);
    const clientState = encodeClientStates(state);
    const privateState = summarizePrivateState(state);
    const game = await continueToResult(engine, events);
    writeResult({ pid: process.pid, clientState, privateState, game });
    return;
  }

  throw new Error(`unknown room handoff worker mode: ${String(mode)}`);
}

function createBoundaryMatch(): { engine: GameEngine; state: GameState; events: ServerEvent[] } {
  const state = new GameState();
  state.matchId = "stage-one-direct-attack-proof";
  state.phase = Phase.Main;
  state.turnSeat = 0;
  state.turnCount = 4;
  state.isFirstPlayersFirstTurn = false;
  state.memory = 0;
  state.stateVersion = 19;

  const events: ServerEvent[] = [];
  const engine = createEngine(state, events);
  engine.seatPlayer(0, "proof-session-0", { displayName: "Seat 0", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "proof-session-1", { displayName: "Seat 1", deck: { mainDeck: [], eggDeck: [] } });

  const player0 = state.players[0]!;
  const player1 = state.players[1]!;
  player0.hand.push(card("s0-hand-0", "BT1-010", 0));
  player0.deck.push(card("s0-deck-0", "BT1-011", 0), card("s0-deck-1", "BT1-012", 0));
  player0.eggDeck.push(card("s0-egg-0", "BT1-001", 0));
  player0.security.push(card("s0-security-0", "BT1-013", 0, false));
  player1.hand.push(card("s1-hand-0", "BT1-030", 1));
  player1.deck.push(card("s1-deck-0", "BT1-031", 1), card("s1-deck-1", "BT1-032", 1));
  player1.eggDeck.push(card("s1-egg-0", "BT1-003", 1));
  player0.deckCount = player0.deck.length;
  player0.eggDeckCount = player0.eggDeck.length;
  player0.handCount = player0.hand.length;
  player0.securityCount = player0.security.length;
  player1.deckCount = player1.deck.length;
  player1.eggDeckCount = player1.eggDeck.length;
  player1.handCount = player1.hand.length;
  // No security for seat 1: the next direct attack is a deterministic terminal action.
  player1.securityCount = 0;

  const attacker = new Permanent();
  attacker.permanentId = "proof-attacker";
  attacker.controllerSeat = 0;
  attacker.topCard = card("s0-attacker", "AD1-001", 0);
  attacker.baseDP = 5000;
  attacker.currentDP = 5000;
  attacker.enterFieldTurnCount = 0;
  player0.battleArea.push(attacker);

  return { engine, state, events };
}

function createEngine(state: GameState, events: ServerEvent[]): GameEngine {
  return new GameEngine(state, {
    seed: 2,
    requestDecision: (_seat, request) => {
      throw new Error(`vertical proof unexpectedly opened a ${request.kind} decision`);
    },
    emit: (event) => events.push(event),
  });
}

function card(instanceId: string, cardId: string, ownerSeat: Seat, faceUp = true): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = instanceId;
  instance.cardId = cardId;
  instance.ownerSeat = ownerSeat;
  instance.faceUp = faceUp;
  return instance;
}

function encodeClientStates(state: GameState): ClientStateSummary[] {
  const encoder = new Encoder(state);
  const views = ([0, 1] as const).map((seat) => ({ seat, view: buildStateView(state, seat) }));
  const iterator = { offset: 0 };
  encoder.encodeAll(iterator);
  const sharedOffset = iterator.offset;

  const summaries = views.map(({ seat, view }) => {
    iterator.offset = sharedOffset;
    const bytes = encoder.encodeAllView(view, sharedOffset, iterator);
    const decoder = new Decoder(new GameState());
    decoder.decode(bytes);
    const clientState = decoder.state;
    const own = clientState.players[seat]!;
    const opponent = clientState.players[(1 - seat) as Seat]!;
    return {
      seat,
      ownHand: own.hand.map((instance) => `${instance.instanceId}:${instance.cardId}`),
      opponentHandCount: opponent.hand.length,
      visibleDeckCount: own.deckCount,
      visibleDeckCardCount: own.deck.length,
      ownSecurityCount: own.securityCount,
    };
  });

  encoder.discardChanges();
  return summaries;
}

function summarizePrivateState(state: GameState): PrivateStateSummary[] {
  return ([0, 1] as const).map((seat) => {
    const player = state.players[seat]!;
    return {
      seat,
      hand: player.hand.map((instance) => `${instance.instanceId}:${instance.cardId}`),
      deck: player.deck.map((instance) => `${instance.instanceId}:${instance.cardId}`),
      eggDeck: player.eggDeck.map((instance) => `${instance.instanceId}:${instance.cardId}`),
      security: player.security.map((instance) => `${instance.instanceId}:${instance.cardId}:${instance.faceUp}`),
      nextDrawInstanceId: player.deck[0]?.instanceId,
    };
  });
}

async function continueToResult(engine: GameEngine, events: ServerEvent[]): Promise<GameResult> {
  const result = engine.applyIntent(0, {
    type: "attack",
    attackerPermanentId: "proof-attacker",
    target: { kind: "player" },
  });
  for (let turn = 0; turn < 100 && !engine.state.gameOver; turn += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  }
  if (!engine.state.gameOver) throw new Error("vertical proof attack did not finish the match");
  return {
    accepted: result.ok,
    gameOver: engine.state.gameOver,
    winnerSeat: engine.state.winnerSeat,
    events: events.filter((event) => event.kind === "gameOver").map((event) => JSON.stringify(event)),
  };
}

function writeResult(value: Record<string, unknown>): void {
  process.stdout.write(`HANDOFF_RESULT:${JSON.stringify(value)}\n`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
