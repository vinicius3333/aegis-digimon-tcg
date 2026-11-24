import type { ReplayDecks } from "@aegis/shared/replays/ReplayDeck";
import { getDeckFeaturedCardId } from "#api/accounts/getDeckFeaturedCardId";
import { buildSpectatorReplayFile } from "#api/replays/buildSpectatorReplayFile";
import { ArraySchema } from "@colyseus/schema";
import { randomUUID } from "node:crypto";
import { constants, zstdCompressSync, zstdDecompressSync } from "node:zlib";
import { copyWithoutSharedBacking } from "#api/replays/copyWithoutSharedBacking";
import { createReplayPatch } from "@aegis/shared/replays/createReplayPatch";
import { decodeReplayFrames } from "@aegis/shared/replays/decodeReplayFrames";
import type { EncodedReplayFrame } from "@aegis/shared/replays/EncodedReplayFrame";
import {
  REPLAY_FORMAT_VERSION,
  MAX_REPLAY_BYTES,
  MAX_REPLAY_FRAMES,
  type CardInstance,
  type GameState,
  type MatchReplay,
  type ReplaySummary,
  type Seat,
  type SequencedServerEvent,
} from "@aegis/shared";

// Leave room for the file envelope and metadata in the expanded import budget.
const MAX_RECORDING_BYTES = MAX_REPLAY_BYTES - 64 * 1024;
const FRAME_COMPRESSION = { params: { [constants.ZSTD_c_compressionLevel]: 1 } };

const UNRECORDED_STATE_FIELDS = new Set(["pendingDecision", "combatWindow"]);
const UNRECORDED_PLAYER_ZONES = new Set(["deck", "eggDeck", "security"]);

const schemaFieldsByConstructor = new WeakMap<object, readonly string[]>();

function replayDeckIcons(decks: ReplayDecks): [string | null, string | null] {
  return [
    decks[0] ? (getDeckFeaturedCardId(decks[0]) ?? null) : null,
    decks[1] ? (getDeckFeaturedCardId(decks[1]) ?? null) : null,
  ];
}

function schemaFieldsOf(schema: object): readonly string[] | undefined {
  const cached = schemaFieldsByConstructor.get(schema.constructor);
  if (cached !== undefined) return cached;
  const metadata = (schema.constructor as unknown as Record<symbol, Record<string, unknown> | undefined>)[
    Symbol.metadata
  ];
  if (metadata === undefined) return undefined;
  const names: string[] = [];
  for (const key in metadata) {
    const field = metadata[key] as { name?: string; deprecated?: boolean } | number;
    if (typeof field === "object" && field.name !== undefined && !field.deprecated) names.push(field.name);
  }
  schemaFieldsByConstructor.set(schema.constructor, names);
  return names;
}

function plainJson(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof ArraySchema) return value.toArray().map(plainJson);
  if (schemaFieldsOf(value) !== undefined) return schemaJson(value, (_name, field) => plainJson(field));
  const serializable = value as { toJSON?: () => unknown };
  return typeof serializable.toJSON === "function" ? serializable.toJSON() : value;
}

function schemaJson(schema: object, fieldJson: (name: string, value: unknown) => unknown): Record<string, unknown> {
  const fields = schemaFieldsOf(schema);
  if (fields === undefined) throw new Error("Replay recording expects a Colyseus schema");
  const json: Record<string, unknown> = {};
  for (const name of fields) {
    const value = (schema as Record<string, unknown>)[name];
    if (value !== null && value !== undefined) json[name] = fieldJson(name, value);
  }
  return json;
}

function stateJsonWithoutHiddenZones(state: GameState): GameState {
  return schemaJson(state, (name, value) => {
    if (UNRECORDED_STATE_FIELDS.has(name)) return undefined;
    if (name !== "players") return plainJson(value);
    return Array.from(value as GameState["players"], (player) =>
      schemaJson(player, (zone, cards) => (UNRECORDED_PLAYER_ZONES.has(zone) ? [] : plainJson(cards))),
    );
  }) as unknown as GameState;
}

/** Deck order and facedown identities never belong in a replay, even after a game. */
export function recordingState(state: GameState): GameState {
  const copy = stateJsonWithoutHiddenZones(state);
  copy.roomCode = "";
  copy.spectatorCode = "";
  copy.pendingDecision = undefined;
  copy.combatWindow = undefined;
  copy.series.nextRoomId = "";
  for (const player of copy.players) {
    player.sessionId = `replay-seat-${player.seat}`;
    player.manualInspectionJson = "[]";
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
        card.trashOriginCardId = "";
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

export interface ParticipantReplayFile {
  summary: ReplaySummary;
  json: string;
}

type SpectatorFileParams = {
  mode: ReplaySummary["mode"];
  hiddenIdentities: readonly boolean[];
  decks?: ReplayDecks;
  finishedAt?: number;
};

export class ReplayRecording {
  readonly id = randomUUID();
  private compressedFrames: Uint8Array[] = [];
  private previousState?: GameState;
  private lastAtMs = 0;
  private bytes = 0;
  private overflow = false;
  private ending?: { players: [string, string]; winnerSeat: number };
  private decompressedFrames?: WeakRef<{ frameCount: number; frames: string[] }>;

  constructor(readonly startedAt = Date.now()) {}

  /** Captures at the closed rules batch, after mutations, with no dependency on patch ticks. */
  capture(state: GameState, events: readonly SequencedServerEvent[], now = Date.now()): void {
    if (this.overflow || this.ending) return;
    const atMs = Math.max(this.lastAtMs, now - this.startedAt);
    const recorded = recordingState(state);
    const frame = Buffer.from(JSON.stringify(this.encodedFrame(atMs, recorded, recordingEvents(events))));
    this.bytes += frame.length;
    if (this.bytes > MAX_RECORDING_BYTES || this.compressedFrames.length >= MAX_REPLAY_FRAMES) {
      this.compressedFrames = [];
      this.previousState = undefined;
      this.overflow = true;
      return;
    }
    this.compressedFrames.push(copyWithoutSharedBacking(zstdCompressSync(frame, FRAME_COMPRESSION)));
    this.previousState = recorded;
    this.lastAtMs = atMs;
    if (!state.gameOver) return;
    this.previousState = undefined;
    this.ending = {
      players: [recorded.players[0]!.displayName, recorded.players[1]!.displayName],
      winnerSeat: recorded.winnerSeat,
    };
  }

  private encodedFrame(atMs: number, state: GameState, events: SequencedServerEvent[]): EncodedReplayFrame {
    if (this.previousState === undefined) return { atMs, events, state };
    const patch = createReplayPatch(this.previousState, state);
    return patch === undefined ? { atMs, events } : { atMs, events, patch };
  }

  complete(mode: ReplaySummary["mode"], finishedAt = Date.now()): MatchReplay | undefined {
    const summary = this.summary(mode, finishedAt);
    if (!summary) return undefined;
    return {
      ...summary,
      version: REPLAY_FORMAT_VERSION,
      frames: decodeReplayFrames(this.serializedFrames().map((frame) => JSON.parse(frame) as unknown)),
      viewerSeat: 0,
      visibleHandSeats: [],
      format: "aegis-replay",
    };
  }

  participantFile(
    mode: ReplaySummary["mode"],
    seat: Seat,
    finishedAt = Date.now(),
    decks?: ReplayDecks,
  ): ParticipantReplayFile | undefined {
    const summary = this.summary(mode, finishedAt);
    if (!summary) return undefined;
    if (decks) {
      summary.deckIcons = replayDeckIcons(decks);
    }
    const envelope = JSON.stringify({
      ...summary,
      ...(decks ? { decks } : {}),
      version: REPLAY_FORMAT_VERSION,
      viewerSeat: seat,
      visibleHandSeats: [0, 1],
      format: "aegis-replay",
    });
    return { summary, json: `{"frames":[${this.serializedFrames().join(",")}],${envelope.slice(1)}` };
  }

  spectatorFile({
    mode,
    hiddenIdentities,
    decks,
    finishedAt = Date.now(),
  }: SpectatorFileParams): ParticipantReplayFile | undefined {
    const replay = this.complete(mode, finishedAt);
    if (replay && decks) {
      replay.decks = decks;
      replay.deckIcons = replayDeckIcons(decks);
    }
    return replay
      ? buildSpectatorReplayFile({ replay, hiddenIdentities, sharedDeckSeats: decks?.map(Boolean) })
      : undefined;
  }

  get exceededLimit(): boolean {
    return this.overflow;
  }

  get frameCount(): number {
    return this.compressedFrames.length;
  }

  private serializedFrames(): string[] {
    const cached = this.decompressedFrames?.deref();
    if (cached !== undefined && cached.frameCount === this.compressedFrames.length) return cached.frames;
    const frames = this.compressedFrames.map((compressed) => zstdDecompressSync(compressed).toString());
    this.decompressedFrames = new WeakRef({ frameCount: frames.length, frames });
    return frames;
  }

  private summary(mode: ReplaySummary["mode"], finishedAt: number): ReplaySummary | undefined {
    if (!this.ending) return undefined;
    return {
      id: this.id,
      players: this.ending.players,
      mode,
      startedAt: this.startedAt,
      finishedAt: Math.max(this.startedAt, finishedAt),
      winnerSeat: this.ending.winnerSeat,
      frameCount: this.compressedFrames.length,
    };
  }
}

/** Completed participant replays expose both recorded hands, never live-game hidden state. */
export function projectReplay(replay: MatchReplay, seat: Seat): MatchReplay {
  if (!replay.frames.at(-1)?.state.gameOver) throw new Error("Only completed games can expose replay hands");
  replay.visibleHandSeats = [0, 1];
  replay.viewerSeat = seat;
  return replay;
}
