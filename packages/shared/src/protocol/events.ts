import type { Seat } from "../schema/enums.js";
import type { AttackTarget } from "./intents.js";

/**
 * Server -> client events: an additional narration/log plus out-of-band info the
 * client cannot derive from a state diff alone. The synchronized GameState delta
 * remains the source of truth for what the board looks like (API-CONTRACT
 * section 5).
 */
export type ServerEvent =
  | { kind: "matchStarted"; firstSeat: Seat }
  | { kind: "phaseChanged"; phase: string; turnSeat: Seat; turnCount: number }
  | { kind: "cardPlayed"; seat: Seat; cardId: string; permanentId?: string }
  | { kind: "digivolved"; seat: Seat; permanentId: string; cardId: string }
  | { kind: "hatched"; seat: Seat; permanentId: string; cardId: string }
  | { kind: "movedFromBreeding"; seat: Seat; permanentId: string; cardId: string }
  | { kind: "memoryChanged"; from: number; to: number; reason: string }
  | {
      kind: "attackDeclared";
      seat: Seat;
      attackerPermanentId: string;
      attackerCardId: string;
      target: AttackTarget;
      /** Public identity of a permanent target at declaration time. */
      targetCardId?: string;
    }
  | { kind: "blockWindowOpened"; attackerPermanentId: string; eligibleBlockerIds: string[] }
  | { kind: "blocked"; blockerPermanentId: string }
  | { kind: "blockDeclined"; attackerPermanentId: string }
  // §11-3 Counter Timing: opened after When Attacking effects resolve and before block
  // timing, for the defending seat to optionally activate 1 [Counter] effect (§11-3-2).
  | {
      kind: "counterWindowOpened";
      attackerPermanentId: string;
      defendingSeat: Seat;
      eligibleCounters: { instanceId: string; effectKey: string; description: string }[];
    }
  | { kind: "counterResolved"; attackerPermanentId: string; activated: boolean }
  // ＜Alliance＞ (Comprehensive Rules §16-24) is attack-only; there is no block-time variant.
  | { kind: "alliancePrompt"; permanentId: string; eligibleAllyIds: string[] }
  | { kind: "allianceResolved"; permanentId: string } // the ＜Alliance＞ decision was answered (chosen or passed); dismisses the prompt overlay
  | { kind: "evadePrompt"; permanentId: string }
  | { kind: "evadeResolved"; permanentId: string; accepted: boolean }
  | { kind: "barrierPrompt"; permanentId: string }
  | { kind: "barrierResolved"; permanentId: string; accepted: boolean }
  | { kind: "combatResolved"; seat: Seat; attackerPermanentId: string; deletedPermanentIds: string[] }
  | {
      kind: "securityChecked";
      seat: Seat;
      revealedCardId: string;
      resolution: "effect" | "battle" | "trashed";
    }
  | { kind: "securityRecovered"; seat: Seat; amount: number }
  | { kind: "cardRevealed"; seat: Seat; cardId: string; sourceCardId?: string }
  | { kind: "effectActivated"; seat: Seat; sourceCardId: string; effectKey: string; description: string }
  | {
      // A triggered effect (On Play / When Digivolving / On Deletion / ...) finished
      // resolving. `timing` is the enum member name (e.g. "OnPlay") so the client can
      // slice the matching printed clause out of the card's effect text for a transient
      // overlay. Distinct from `effectActivated`, which is a [Main] activated ability.
      kind: "effectResolved";
      seat: Seat;
      sourceCardId: string;
      effectKey: string;
      description: string;
      timing?: string;
    }
  | { kind: "cardsMoved"; instanceIds: string[]; from: string; to: string } // generic zone movement for the log
  | { kind: "turnEnded"; endingSeat: Seat; nextSeat: Seat; turnCount: number } // turn transition overlay
  | { kind: "actionRejected"; intent: string; reason: string } // sent to the offending client only
  | {
      kind: "gameOver";
      // A discriminated `result` — rather than a bare `winnerSeat: Seat` with a
      // -1 sentinel, or `winnerSeat: Seat | -1` — so a draw can't be silently
      // misread as seat -1 winning: every consumer must branch on `outcome`
      // before it can reach a `winnerSeat`, so the type checker catches a
      // consumer that forgets the draw case instead of it shipping a UI bug.
      result: { outcome: "win"; winnerSeat: Seat } | { outcome: "draw" };
      reason: "security" | "deckOut" | "surrender" | "effect";
    };

export type ServerEventKind = ServerEvent["kind"];

/**
 * The ServerEvent kinds answered by a dedicated intent (declareBlock/
 * declineBlock, respondCounter, respondAlliance, respondEvade, respondBarrier)
 * rather than respondDecision. `satisfies` pins each entry to a real
 * ServerEventKind, so renaming or removing one of these in the ServerEvent union
 * fails typecheck here; see the UI completeness invariant in API-CONTRACT.md for
 * how new combat-prompt events get UI coverage enforced (uiCompleteness.test.ts).
 */
export const COMBAT_PROMPT_EVENTS = [
  "blockWindowOpened",
  "counterWindowOpened",
  "alliancePrompt",
  "evadePrompt",
  "barrierPrompt",
] as const satisfies readonly ServerEventKind[];

export type CombatPromptEvent = (typeof COMBAT_PROMPT_EVENTS)[number];

/**
 * Sent on the dedicated "decision" channel when the engine pauses for input. The
 * engine awaits the matching respondDecision intent (correlated by decisionId).
 */
export interface DecisionRequest {
  decisionId: string;
  seat: Seat;
  kind: "optional" | "chooseTargets" | "selectCards" | "orderCards" | "orderTriggers" | "chooseOption" | "mulligan";
  promptText: string;
  /** The card whose effect is asking for input (so the client can show its name/sigil/text without guessing from the event log). */
  sourceCardId?: string;
  // kind-specific options the UI needs to render the prompt and constrain input:
  options?: {
    candidateInstanceIds?: string[]; // selectable cards/permanents
    visibleInstanceIds?: string[]; // full display set (e.g. all revealed cards); ids absent from candidateInstanceIds render disabled
    /** Authoritative identities for temporarily revealed cards that may not yet exist in the client's zone index. */
    visibleCards?: { instanceId: string; cardId: string }[];
    min?: number;
    max?: number; // selection count bounds
    maxTotalPlayCost?: number; // summed printed play-cost budget for multi-card selections
    differentColors?: boolean; // prevent selecting cards that share a color with an already-picked card
    distinctCardIds?: boolean; // prevent selecting multiple instances with the same card number
    orderDestination?: "deckTop" | "deckBottom" | "stackBottom"; // explains how ordered positions map to the destination
    choices?: string[]; // modal labels for chooseOption
    triggerKeys?: string[]; // pending choices for orderTriggers; the client selects exactly one
    triggerCardIds?: string[]; // authoritative source card for each triggerKeys entry
    timing?: string; // printed timing label of the resolving effect (e.g. "On Play"), for the overlay to show only that clause
    /** Exact clause that raised this decision, preserving main/inherited provenance without client-side guessing. */
    effectText?: string;
    promptKey?: "activateBlitz";
  };
}

export type DecisionKind = DecisionRequest["kind"];

/**
 * Runtime enumeration of DecisionKind, pinned to the type in both directions:
 * `satisfies` rejects an entry that isn't a real DecisionKind, and
 * `_DecisionKindsComplete` below rejects a DecisionKind missing from this
 * array. A UI decision-kind renderer added without updating this list — or a
 * new DecisionRequest.kind added without a UI renderer — fails typecheck or
 * uiCompleteness.test.ts (see the UI completeness invariant in
 * API-CONTRACT.md).
 */
export const DECISION_KINDS = [
  "optional",
  "chooseTargets",
  "selectCards",
  "orderCards",
  "orderTriggers",
  "chooseOption",
  "mulligan",
] as const satisfies readonly DecisionKind[];

type _DecisionKindsComplete = Exclude<DecisionKind, (typeof DECISION_KINDS)[number]> extends never ? true : never;
const _decisionKindsComplete: _DecisionKindsComplete = true;
void _decisionKindsComplete;
