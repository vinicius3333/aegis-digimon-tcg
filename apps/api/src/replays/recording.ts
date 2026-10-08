import { randomUUID } from "node:crypto";
import {
  REPLAY_FORMAT_VERSION,
  MAX_REPLAY_BYTES,
  type CardInstance,
  type GameState,
  type MatchReplay,
  type ReplayFrame,
  type ReplaySummary,
  type Seat,
  type SequencedServerEvent,
} from "@aegis/shared";

// Leave room for the file envelope and metadata in the expanded import budget.
const MAX_RECORDING_BYTES = MAX_REPLAY_BYTES - 64 * 1024;
const MAX_FRAMES = 5000;

/** Deck order and facedown identities never belong in a replay, even after a game. */
export function recordingState(state: GameState): GameState {
  const copy = state.toJSON() as unknown as GameState;
  copy.roomCode = "";
  copy.spectatorCode = "";
  copy.pendingDecision = undefined;
  copy.combatWindow = undefined;
  copy.series.nextRoomId = "";
  for (const player of copy.players) {
    player.sessionId = `replay-seat-${player.seat}`;
    player.deck = [] as never;
    player.eggDeck = [] as never;
    player.security = [] as never;
    for (const card of player.securityView) {
      if (!card.faceUp) {
        card.cardId = "";
        card.artId = "";
      }
    }
    const redact = (card: CardInstance) => {
      if (!card.faceUp) {
        card.cardId = "";
        card.artId = "";
        card.activatableEffectsJson = "";
        card.digivolveRoutes = [] as never;
        card.dnaDigivolveRoutes = [] as never;
        card.appFusionRoutes = [] as never;
      }
    };
    if (player.resolvingOption) redact(player.resolvingOption);
    for (const card of player.trash) redact(card);
    for (const card of player.delayZone) redact(card);
    for (const permanent of [...player.battleArea, ...(player.breeding ? [player.breeding] : [])]) {
      redact(permanent.topCard);
      for (const card of permanent.stack) redact(card);
      for (const card of permanent.linked) redact(card);
    }
  }
  return copy;
}

/** Only shared, broadcast events enter here. Resyncs and rejections are excluded by the room. */
export function recordingEvents(events: readonly SequencedServerEvent[]): SequencedServerEvent[] {
  return events
    .filter((event) => event.kind !== "finalReveal")
    .map((event) => structuredClone(event.kind === "counterWindowOpened" ? { ...event, eligibleCounters: [] } : event));
}

export class ReplayRecording {
  readonly id = randomUUID();
  private frames: ReplayFrame[] = [];
  private bytes = 0;
  private overflow = false;
  private finished = false;

  constructor(readonly startedAt = Date.now()) {}

  /** Captures at the closed rules batch, after mutations, with no dependency on patch ticks. */
  capture(state: GameState, events: readonly SequencedServerEvent[], now = Date.now()): void {
    if (this.overflow || this.finished) return;
    const frame = {
      atMs: Math.max(this.frames.at(-1)?.atMs ?? 0, now - this.startedAt),
      state: recordingState(state),
      events: recordingEvents(events),
    };
    this.bytes += Buffer.byteLength(JSON.stringify(frame));
    if (this.bytes > MAX_RECORDING_BYTES || this.frames.length >= MAX_FRAMES) {
      this.frames = [];
      this.overflow = true;
      return;
    }
    this.frames.push(frame);
    this.finished = state.gameOver;
  }

  complete(mode: ReplaySummary["mode"], finishedAt = Date.now()): MatchReplay | undefined {
    const last = this.frames.at(-1);
    if (!this.finished || !last) return undefined;
    return {
      version: REPLAY_FORMAT_VERSION,
      id: this.id,
      players: [last.state.players[0]!.displayName, last.state.players[1]!.displayName],
      mode,
      startedAt: this.startedAt,
      finishedAt: Math.max(this.startedAt, finishedAt),
      winnerSeat: last.state.winnerSeat,
      frameCount: this.frames.length,
      frames: this.frames,
      viewerSeat: 0,
      visibleHandSeats: [],
      format: "aegis-replay",
    };
  }

  get exceededLimit(): boolean {
    return this.overflow;
  }
}

/** Completed participant replays expose both recorded hands, never live-game hidden state. */
export function projectReplay(replay: MatchReplay, seat: Seat): MatchReplay {
  if (!replay.frames.at(-1)?.state.gameOver) throw new Error("Only completed games can expose replay hands");
  replay.visibleHandSeats = [0, 1];
  replay.viewerSeat = seat;
  return replay;
}
