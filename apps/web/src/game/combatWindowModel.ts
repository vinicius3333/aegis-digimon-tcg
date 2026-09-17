/* Combat windows — block, counter and the mirrored view of the opponent's prompt — read
   from the state and the event stream. */

import { combatWindowKey, type CombatWindowKind, type GameState, type Seat, type ServerEvent } from "@aegis/shared";
import { findPermanentInState } from "./decisionModel";

/**
 * An event as read off the live log for combat-prompt derivation. `stateVersion` is present
 * on every event the room actually sends (SequencedServerEvent) and absent only on hand-built
 * test fixtures / older-server replays — callers that need it (the presentation barrier) treat
 * a missing value the same way a missing `decision.stateVersion` is already treated: no barrier
 * is raised, the prompt just shows immediately.
 */
type CombatPromptEvent = ServerEvent & { stateVersion?: number; seq?: number };

/**
 * The open combat prompt as the SERVER reports it in synchronized state (GameState.combatWindow),
 * already scoped to the viewer's seat.
 *
 * The five `*WindowOpened` / `*Prompt` events still drive the presentation queue, but a channel
 * message sent while this client's socket was down is never redelivered, and the live log is a
 * capped ring buffer — so whether a window is still open is read from here, and the log is left
 * to answer only "at which revision did it open" (the presentation barrier's input).
 */
export interface MirroredCombatWindow {
  key: string;
  kind: CombatWindowKind;
  seat: Seat;
  attackerPermanentId: string;
  permanentId: string;
  eligiblePermanentIds: string[];
  eligibleCounters: { instanceId: string; effectKey: string; description: string }[];
  mustBlock: boolean;
}

/** The authoritative open combat window for `viewerSeat`, or null when none is open for it. */
export function mirroredCombatWindow(state: GameState, viewerSeat: Seat): MirroredCombatWindow | null {
  const window = state.combatWindow;
  if (!window || window.seat !== viewerSeat) return null;
  return {
    key: combatWindowKey(window),
    kind: window.kind,
    seat: window.seat,
    attackerPermanentId: window.attackerPermanentId,
    permanentId: window.permanentId,
    eligiblePermanentIds: [...window.eligiblePermanentIds],
    eligibleCounters: window.eligibleCountersJson
      ? (JSON.parse(window.eligibleCountersJson) as MirroredCombatWindow["eligibleCounters"])
      : [],
    mustBlock: window.mustBlock,
  };
}

/** The intents that answer one of the five combat-prompt windows. */
const COMBAT_ANSWER_INTENTS = new Set<string>([
  "declareBlock",
  "declineBlock",
  "respondCounter",
  "respondAlliance",
  "respondEvade",
  "respondBarrier",
]);

/**
 * The `seq` of the most recent refused combat answer, or undefined when none was refused.
 *
 * A client hides a combat prompt as soon as it dispatches the answer, before the server has
 * accepted it. When the server refuses (an ally that just became illegal, no security left to
 * pay ＜Barrier＞ with, an intent dropped and re-queued across a connection blip) the window is
 * still open, so the refusal is what rolls that optimistic hide back.
 */
export function lastRejectedCombatAnswer(events: readonly CombatPromptEvent[]): number | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.kind === "actionRejected" && COMBAT_ANSWER_INTENTS.has(event.intent)) return event.seq ?? index + 1;
  }
  return undefined;
}

export interface ActiveBlockWindow {
  attackerPermanentId: string;
  eligibleBlockerIds: string[];
  /** ＜Collision＞: the block is compulsory, so the window offers no way out of it. */
  mustBlock: boolean;
  /** The room state revision `blockWindowOpened` was emitted under, for barrier-gating. */
  stateVersion?: number;
}

/** Derive a real, still-pending block response from the synchronized event stream. */
export function activeBlockWindow(
  events: readonly CombatPromptEvent[],
  isViewerTurn: boolean,
  mirrored?: MirroredCombatWindow | null,
): ActiveBlockWindow | null {
  const fromState =
    mirrored?.kind === "block"
      ? {
          attackerPermanentId: mirrored.attackerPermanentId,
          eligibleBlockerIds: mirrored.eligiblePermanentIds,
          mustBlock: mirrored.mustBlock,
        }
      : null;
  // The mirrored window names the answering seat, so it needs no turn inference and stands even
  // when the opening event never reached this client (dropped socket, evicted from the log).
  if (isViewerTurn) return fromState;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.kind === "blockWindowOpened") {
      // Empty events from older/replayed servers were diagnostic markers, not a
      // pending decision. Rendering them creates a ghost prompt while combat proceeds.
      if (event.eligibleBlockerIds.length === 0) return null;
      return {
        attackerPermanentId: event.attackerPermanentId,
        eligibleBlockerIds: event.eligibleBlockerIds,
        mustBlock: event.mustBlock === true,
        stateVersion: event.stateVersion,
      };
    }
    if (
      event.kind === "blocked" ||
      event.kind === "blockDeclined" ||
      event.kind === "combatResolved" ||
      event.kind === "securityChecked" ||
      event.kind === "gameOver" ||
      event.kind === "phaseChanged"
    )
      return null;
  }
  return fromState;
}

export interface ActiveCounterWindow {
  attackerPermanentId: string;
  eligibleCounters: { instanceId: string; effectKey: string; description: string }[];
  /** The room state revision `counterWindowOpened` was emitted under, for barrier-gating. */
  stateVersion?: number;
}

/** Derive a real, still-pending Counter response from the synchronized event stream. */
export function activeCounterWindow(
  events: readonly CombatPromptEvent[],
  viewerSeat: Seat,
  isViewerTurn: boolean,
  mirrored?: MirroredCombatWindow | null,
): ActiveCounterWindow | null {
  const fromState =
    mirrored?.kind === "counter"
      ? { attackerPermanentId: mirrored.attackerPermanentId, eligibleCounters: mirrored.eligibleCounters }
      : null;
  if (isViewerTurn) return fromState;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.kind === "counterWindowOpened") {
      if (event.defendingSeat !== viewerSeat || event.eligibleCounters.length === 0) return null;
      return {
        attackerPermanentId: event.attackerPermanentId,
        eligibleCounters: event.eligibleCounters,
        stateVersion: event.stateVersion,
      };
    }
    if (
      event.kind === "blockWindowOpened" ||
      event.kind === "blocked" ||
      event.kind === "counterResolved" ||
      event.kind === "combatResolved" ||
      event.kind === "securityChecked" ||
      event.kind === "gameOver" ||
      event.kind === "phaseChanged"
    )
      return null;
  }
  return fromState;
}

/** Which combat-prompt window (if any) is currently open, and at what state revision. */
export interface OpenCombatWindow {
  /** Stable identity of the open window, e.g. `"block:<attackerPermanentId>"`. Changes only
   * when a genuinely new prompt opens (the previous one must fully resolve first — the server
   * never has two of these open at once), so it is safe to use as a React dependency key. */
  key: string;
  /** The room state revision the window's opening event was emitted under, if known. */
  stateVersion?: number;
}

/**
 * Whether ANY of the five combat-prompt windows (block, §11-3 Counter, Alliance, Evade,
 * Barrier) is open for `viewerSeat`, and the state revision it opened at.
 *
 * This exists so the presentation barrier (docs/presentation-queue-plan.md 3.2) can hold these
 * prompts the same way it holds a `pendingDecision` prompt: today they render straight off the
 * live event log with no relation to the animation queue, so a queued-but-not-yet-played attack
 * toast can be beaten to the screen by, say, the block window it itself opened. Deliberately
 * mirrors the five `active*Window` functions' own scan-and-terminate logic rather than calling
 * them, because it only needs the fact of an open window plus its version — not each kind's full
 * payload (blocker list, eligible allies, ...) — so it can run before those payloads exist.
 */
export function openCombatWindow(
  events: readonly CombatPromptEvent[],
  state: GameState,
  viewerSeat: Seat,
): OpenCombatWindow | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    switch (event.kind) {
      case "blockWindowOpened":
        // `blockWindowOpened` names no seat, so the defender is the player whose turn it is
        // not — the same test `activeBlockWindow` makes. Without it the ATTACKER's client
        // also reads the window as its own question and raises a barrier that fast-forwards
        // the queue, dropping the cues of everything the defender does in that window
        // (a Blast Digivolve answering the attack, say) before they reach the screen.
        if (state.turnSeat === viewerSeat) return null;
        if (event.eligibleBlockerIds.length === 0) return null;
        return { key: `block:${event.attackerPermanentId}`, stateVersion: event.stateVersion };
      case "counterWindowOpened":
        if (event.defendingSeat !== viewerSeat || event.eligibleCounters.length === 0) return null;
        return { key: `counter:${event.attackerPermanentId}`, stateVersion: event.stateVersion };
      case "alliancePrompt":
        if (findPermanentInState(state, event.permanentId)?.controllerSeat !== viewerSeat) return null;
        return { key: `alliance:${event.permanentId}`, stateVersion: event.stateVersion };
      case "evadePrompt":
        if (findPermanentInState(state, event.permanentId)?.controllerSeat !== viewerSeat) return null;
        return { key: `evade:${event.permanentId}`, stateVersion: event.stateVersion };
      case "barrierPrompt":
        if (findPermanentInState(state, event.permanentId)?.controllerSeat !== viewerSeat) return null;
        return { key: `barrier:${event.permanentId}`, stateVersion: event.stateVersion };
      case "blocked":
      case "blockDeclined":
      case "counterResolved":
      case "allianceResolved":
      case "evadeResolved":
      case "barrierResolved":
      case "combatResolved":
      case "securityChecked":
      case "gameOver":
      case "phaseChanged":
        return null;
      default:
        continue;
    }
  }
  // No opening event in the live log — it was broadcast while this client was disconnected, or
  // it has aged out of the capped ring buffer. Synchronized state still knows the window is
  // open; it carries no revision, and a window with no known revision raises no barrier.
  const mirrored = mirroredCombatWindow(state, viewerSeat);
  return mirrored ? { key: mirrored.key } : null;
}
