import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  REPLAY_FORMAT_VERSION,
  type MatchReplay,
} from "@aegis/shared";
import { validReplayEvent } from "./eventValidation";

const stateDefaults = new GameState().toJSON();
const playerDefaults = new PlayerState().toJSON();
const permanentDefaults = new Permanent().toJSON();
const cardDefaults = new CardInstance().toJSON();
function defaultFields(value: RecordValue, defaults: RecordValue): boolean {
  return Object.entries(defaults).every(([key, item]) =>
    Array.isArray(item)
      ? Array.isArray(value[key])
      : typeof item === "object"
        ? record(value[key])
        : typeof value[key] === typeof item,
  );
}
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const seat = (value: unknown) => value === 0 || value === 1;
const string = (value: unknown): value is string => typeof value === "string" && value.length <= 65536;
const array = (value: unknown, check: (item: unknown) => boolean): boolean =>
  Array.isArray(value) && value.length <= 1000 && value.every(check);

function safeTree(value: unknown, depth = 0): boolean {
  if (depth > 24) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return string(value);
  if (typeof value === "number") return number(value);
  if (Array.isArray(value)) return value.length <= 5000 && value.every((item) => safeTree(item, depth + 1));
  if (!record(value)) return false;
  return Object.entries(value).every(
    ([key, item]) => !["__proto__", "prototype", "constructor"].includes(key) && safeTree(item, depth + 1),
  );
}

function card(value: unknown): boolean {
  return (
    record(value) &&
    defaultFields(value, cardDefaults) &&
    string(value.instanceId) &&
    string(value.cardId) &&
    string(value.artId) &&
    seat(value.ownerSeat) &&
    typeof value.faceUp === "boolean" &&
    array(value.digivolveTargetPermanentIds, string) &&
    array(value.linkTargetPermanentIds, string) &&
    array(value.dnaDigivolveRoutes, record)
  );
}

function permanent(value: unknown): boolean {
  return (
    record(value) &&
    defaultFields(value, permanentDefaults) &&
    string(value.permanentId) &&
    card(value.topCard) &&
    array(value.stack, card) &&
    array(value.linked, card) &&
    number(value.currentDP) &&
    typeof value.isSuspended === "boolean" &&
    [
      "keywords",
      "grantedKeywords",
      "grantedEffectTexts",
      "originalColorsOverride",
      "digiXrosNames",
      "attackablePermanentIds",
      "vortexAttackablePermanentIds",
    ].every((key) => array(value[key], string))
  );
}

function player(value: unknown, index: number): boolean {
  if (
    !record(value) ||
    !defaultFields(value, playerDefaults) ||
    value.seat !== index ||
    !string(value.displayName) ||
    !string(value.sessionId) ||
    !string(value.avatarId) ||
    !string(value.fieldEffectsJson) ||
    typeof value.connected !== "boolean"
  )
    return false;
  try {
    if (!array(JSON.parse(value.fieldEffectsJson), record)) return false;
  } catch {
    return false;
  }
  return (
    ["deck", "eggDeck", "hand", "security", "trash", "delayZone"].every((key) => array(value[key], card)) &&
    array(
      value.securityView,
      (item) =>
        record(item) &&
        string(item.instanceId) &&
        string(item.cardId) &&
        string(item.artId) &&
        typeof item.faceUp === "boolean",
    ) &&
    ["deckCount", "eggDeckCount", "handCount", "securityCount"].every(
      (key) => number(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= 1000,
    ) &&
    array(value.battleArea, permanent) &&
    (value.breeding === undefined || value.breeding === null || permanent(value.breeding))
  );
}

export function validateReplay(value: unknown): value is MatchReplay {
  if (
    !record(value) ||
    !safeTree(value) ||
    value.format !== "aegis-replay" ||
    value.version !== REPLAY_FORMAT_VERSION ||
    !string(value.id) ||
    !seat(value.viewerSeat) ||
    !Array.isArray(value.visibleHandSeats) ||
    !array(value.visibleHandSeats, seat) ||
    value.visibleHandSeats.length < 1 ||
    value.visibleHandSeats.length > 2 ||
    new Set(value.visibleHandSeats).size !== value.visibleHandSeats.length ||
    !value.visibleHandSeats.includes(value.viewerSeat) ||
    !array(value.players, string) ||
    (value.players as unknown[]).length !== 2 ||
    !string(value.mode) ||
    !number(value.startedAt) ||
    !number(value.finishedAt) ||
    value.finishedAt < value.startedAt ||
    !number(value.winnerSeat) ||
    ![-1, 0, 1].includes(value.winnerSeat) ||
    !Array.isArray(value.frames) ||
    value.frames.length === 0 ||
    value.frames.length > 5000 ||
    value.frameCount !== value.frames.length
  )
    return false;
  let previousTime = -1;
  let previousVersion = -1;
  for (const frame of value.frames) {
    if (!record(frame) || !number(frame.atMs) || frame.atMs < previousTime || !record(frame.state)) return false;
    const state = frame.state;
    if (
      !defaultFields(state, stateDefaults) ||
      !number(state.stateVersion) ||
      state.stateVersion <= previousVersion ||
      !number(state.turnCount) ||
      !seat(state.turnSeat) ||
      !string(state.phase) ||
      !number(state.memory) ||
      Math.abs(state.memory) > 10 ||
      typeof state.gameOver !== "boolean" ||
      !Array.isArray(state.players) ||
      state.players.length !== 2 ||
      !state.players.every(player) ||
      !record(state.series) ||
      !defaultFields(state.series, stateDefaults.series) ||
      !Array.isArray(frame.events) ||
      !array(frame.events, validReplayEvent)
    )
      return false;
    const batch = frame.events[0]?.batch;
    if (
      frame.events.some((event: RecordValue) => event.batch !== batch) ||
      state.players.some(
        (p: RecordValue) => !(value.visibleHandSeats as unknown[]).includes(p.seat) && (p.hand as unknown[]).length > 0,
      )
    )
      return false;
    // Replay never carries resumable prompts or hidden pile order, including imported files.
    if (
      state.pendingDecision != null ||
      state.combatWindow != null ||
      state.players.some(
        (p: RecordValue) =>
          (p.deck as unknown[]).length > 0 ||
          (p.eggDeck as unknown[]).length > 0 ||
          (p.security as unknown[]).length > 0,
      )
    )
      return false;
    previousTime = frame.atMs;
    previousVersion = state.stateVersion;
  }
  return value.frames.at(-1).state.gameOver === true;
}
