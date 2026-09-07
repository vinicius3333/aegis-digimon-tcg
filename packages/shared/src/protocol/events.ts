import type { Seat } from "../schema/enums.js";
import type { AttackTarget } from "./intents.js";

/**
 * Server -> client events: an additional narration/log plus out-of-band info the
 * client cannot derive from a state diff alone. The synchronized GameState delta
 * remains the source of truth for what the board looks like (API-CONTRACT
 * section 5).
 */
/**
 * The DP compare of a Security Digimon battle (Comprehensive Rules §13-1-8-3), published so
 * the client can dramatize the losing side instead of inferring one from later deletions.
 *
 * These are the compare's verdicts, exactly as the rules resolve them — a tie loses on BOTH
 * sides. `attackerDeleted` is therefore what the battle decided, not what finally happened:
 * ＜Jamming＞ and the deletion-replacement pipeline (Armor Purge, Decoy, Material Save) can
 * still spare a losing attacker, and the Security Digimon is a loose card that CR 14-2-3
 * keeps alive and CR 13-1-8-4 trashes regardless of the verdict.
 */
export interface SecurityBattleResult {
  attackerDeleted: boolean;
  securityDigimonDeleted: boolean;
}

/**
 * How a permanent gained its current top card, for the client's evolution cut-in tier.
 * Display-only provenance in the same family as {@link TargetFate}: the engine already
 * distinguishes these paths because their costs and requirements differ, so the client
 * picks a tier from the fact instead of guessing one from the board diff.
 *
 * - `normal` — the printed EvoCost colour+level path.
 * - `alternate` — a gateless alternate `[Digivolve]` requirement. Armor, X-Antibody and
 *   "digivolve from [ExactCard]" all compile down to this one shape (engine/cards/cardData.ts),
 *   so they are genuinely indistinguishable at the dispatch point and share a value rather
 *   than being guessed apart.
 * - `baseGranted` — a digivolve granted by the base card (ST7-03 / BT6-060).
 * - `burst` — ＜Burst Digivolve＞ (§8-3-2-1).
 * - `blast` — ＜Blast Digivolve＞ / ＜Blast DNA Digivolve＞ cost waiver (§16-26-1 / §16-31-1).
 * - `dna` — DNA digivolve / Jogress (§8-2-2), two permanents merging into one.
 * - `digiXros` — a DigiXros play consuming materials (§7-2-2-7).
 */
export type DigivolveMechanic = "normal" | "alternate" | "baseGranted" | "burst" | "blast" | "dna" | "digiXros";

export type ServerEvent =
  | { kind: "matchStarted"; firstSeat: Seat }
  | { kind: "phaseChanged"; phase: string; turnSeat: Seat; turnCount: number }
  | {
      kind: "cardPlayed";
      seat: Seat;
      cardId: string;
      permanentId?: string;
      /** Present when this play IS a digivolution mechanic that the engine models as a play
       * rather than as a `digivolved` event: DNA digivolve (§8-2-2) consumes two permanents,
       * DigiXros (§7-2-2-7) consumes materials. Absent for an ordinary play. */
      mechanic?: Extract<DigivolveMechanic, "dna" | "digiXros">;
      /** Top cards of the permanents consumed as DNA materials, for the cut-in's two flanking
       * card images (JogressEffectObject.cs:24). DNA only — every one of them was a face-up
       * battle-area top card a moment ago, so this reveals nothing new. */
      sourceCardIds?: string[];
    }
  | {
      kind: "digivolved";
      seat: Seat;
      permanentId: string;
      cardId: string;
      mechanic: DigivolveMechanic;
      /** Present and true when the digivolution happened in the breeding area; absent means
       * the battle area. The client announces a breeding digivolution differently, because
       * the corner slot is not where the viewer is looking. */
      inBreeding?: boolean;
    }
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
  | {
      kind: "blockWindowOpened";
      attackerPermanentId: string;
      eligibleBlockerIds: string[];
      /**
       * ＜Collision＞ (§16-30): the defending player is forced to block whenever able, so
       * declining is illegal while an eligible blocker exists. The server enforces it either
       * way; the flag is what lets the client stop offering a choice it will reject.
       */
      mustBlock?: boolean;
    }
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
      // The top security card was turned face up. Emitted the moment the card is flipped —
      // before its [Security] effect, before the triggers the check fires, and before the
      // battle — so the client can show WHICH card was revealed at the moment of the attack
      // and play everything that follows from it as a consequence. `securityChecked` closes
      // the same check and carries the outcome; there is exactly one of each, in this order.
      kind: "securityRevealed";
      seat: Seat;
      revealedCardId: string;
      attackerPermanentId: string;
      /**
       * Presentation hints known at the reveal, so the client can stage the card the way
       * the reference client does: a card with a [Security] effect docks at the side of the
       * screen while the effect resolves; a Security Digimon holds centre-stage for its
       * battle; anything else is simply shown and trashed. Absent on events from older
       * servers or replays, in which case the client falls back to the `securityChecked`
       * resolution.
       */
      hasSecurityEffect?: boolean;
      isDigimon?: boolean;
    }
  | {
      kind: "securityChecked";
      seat: Seat;
      revealedCardId: string;
      resolution: "effect" | "battle" | "trashed";
      /** The DP compare, present exactly when a compare happened (`resolution === "battle"`
       * and the attacker was still on the field at the compare). */
      battle?: SecurityBattleResult;
    }
  | { kind: "securityRecovered"; seat: Seat; amount: number }
  // A seat's deck or egg deck was randomized. Emitted from the engine's single deck-shuffle
  // helper (`setup.shuffleDecks`), which is the only thing in the game that shuffles a deck:
  // every printed "shuffle" in the card pool shuffles a SECURITY stack instead, and §3-2-3
  // forbids reordering a deck otherwise. Carries no card identity, so it reveals nothing.
  | { kind: "deckShuffled"; seat: Seat; deck: "deck" | "eggDeck" }
  | { kind: "cardRevealed"; seat: Seat; cardId: string; sourceCardId?: string }
  | { kind: "effectActivated"; seat: Seat; sourceCardId: string; effectKey: string; description: string }
  | {
      // A triggered effect (On Play / When Digivolving / ...) STARTED resolving. Emitted
      // before the effect's optional prompt and any in-body decisions, so the client can
      // announce the effect ahead of the "opponent is selecting" wait it may open.
      kind: "effectTriggered";
      seat: Seat;
      sourceCardId: string;
      effectKey: string;
      description: string;
      timing?: string;
      /**
       * The clause lives in the source card's inherited text box. Some timings appear in
       * both text boxes, so without this the client can only guess which box to quote.
       */
      isInherited?: boolean;
      /**
       * The effect fired while a security check was resolving. `securityChecked` closes
       * the check and so is emitted AFTER these effects; the flag lets the client hold
       * what they announce until the checked card's reveal has actually been shown.
       */
      duringSecurityCheck?: boolean;
    }
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
      /** The clause lives in the source card's inherited text box (see `effectTriggered`). */
      isInherited?: boolean;
    }
  | {
      // Generic zone movement for the log. Identity-free by default: the event is
      // broadcast the instant it happens, which is normally BEFORE the state patch
      // that lands the cards in their destination, so a client cannot reliably
      // resolve `instanceIds` against its own zone index at delivery time.
      kind: "cardsMoved";
      instanceIds: string[];
      from: string;
      to: string;
      /**
       * Card identities, in `instanceIds` order — present only when the movement
       * itself makes them public (an effect trashing security cards turns them face
       * up in a public trash). Carried on the event so the destruction scene and the
       * panel can name the cards without racing the state patch.
       */
      cardIds?: string[];
      /**
       * The seat whose zone the movement is about, when the event names one: the stack
       * the cards left (with `cardIds`, an effect trashing security cards) or the stack
       * they joined (an effect adding to security, whose face-down cards stay unnamed).
       */
      seat?: Seat;
    }
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
 * Runtime enumeration of ServerEventKind, pinned to the type in both directions the
 * same way DECISION_KINDS is: `satisfies` rejects an entry that isn't a real kind, and
 * `_ServerEventKindsComplete` rejects a kind missing from this array.
 *
 * It exists so the client can assert that every event the server can send reaches a
 * player-facing surface (match log, opponent action feed, combat-prompt overlay) or is
 * listed as deliberately silent — see uiCompleteness.test.ts. Without it, a new event
 * kind could ship narrating nothing and no test would notice.
 */
export const SERVER_EVENT_KINDS = [
  "matchStarted",
  "phaseChanged",
  "cardPlayed",
  "digivolved",
  "hatched",
  "movedFromBreeding",
  "memoryChanged",
  "attackDeclared",
  "blockWindowOpened",
  "blocked",
  "blockDeclined",
  "counterWindowOpened",
  "counterResolved",
  "alliancePrompt",
  "allianceResolved",
  "evadePrompt",
  "evadeResolved",
  "barrierPrompt",
  "barrierResolved",
  "combatResolved",
  "securityRevealed",
  "securityChecked",
  "securityRecovered",
  "deckShuffled",
  "cardRevealed",
  "effectActivated",
  "effectTriggered",
  "effectResolved",
  "cardsMoved",
  "turnEnded",
  "actionRejected",
  "gameOver",
] as const satisfies readonly ServerEventKind[];

type _ServerEventKindsComplete =
  Exclude<ServerEventKind, (typeof SERVER_EVENT_KINDS)[number]> extends never ? true : never;
const _serverEventKindsComplete: _ServerEventKindsComplete = true;
void _serverEventKindsComplete;

/**
 * `cardsMoved.to` for a return that lands UNDER the whole deck rather than on top.
 *
 * Not a {@link Zone} member: the deck bottom is a POSITION within the deck, while `Zone`
 * members are the storage arrays the engine switches on (`zoneArrayOf`), so adding one there
 * would push a non-array through every one of those switches. `cardsMoved.to` is a free-form
 * display label that no rules code branches on, which is why the position is safe to name here.
 */
export const DECK_BOTTOM = "deckBottom";

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
 * What the action currently resolving will do to the permanents it is asking the
 * player to pick. Projected by the engine from the IR action kind alone (there is
 * one dispatch point, `runAction`), so the client can badge a chosen target with
 * its coming fate instead of guessing one out of the prompt's printed English.
 * Display-only: nothing in the rules reads it back.
 */
export type TargetFate =
  | "delete"
  | "trash"
  | "returnToHand"
  | "returnToDeck"
  | "returnToEggDeck"
  | "suspend"
  | "unsuspend"
  | "digivolve";

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
    maxTotalDP?: number; // summed live-DP budget for aggregate permanent selections
    differentColors?: boolean; // prevent selecting cards that share a color with an already-picked card
    distinctCardIds?: boolean; // prevent selecting multiple instances with the same card number
    orderDestination?: "deckTop" | "deckBottom" | "stackBottom"; // explains how ordered positions map to the destination
    choices?: string[]; // modal labels for chooseOption
    triggerKeys?: string[]; // pending choices for orderTriggers; the client selects exactly one
    triggerCardIds?: string[]; // authoritative source card for each triggerKeys entry
    /**
     * Firing window of each `triggerKeys` entry (e.g. "OnPlay", "WhenDigivolving"),
     * aligned by index; an empty string marks an entry the engine has no timing for.
     * Two triggers of the SAME permanent differ only by this, so the chooser needs it
     * to tell them apart without inventing a "copy" that is not on the board.
     */
    triggerTimings?: string[];
    timing?: string; // printed timing label of the resolving effect (e.g. "On Play"), for the overlay to show only that clause
    /** Exact clause that raised this decision, preserving main/inherited provenance without client-side guessing. */
    effectText?: string;
    /** What the resolving action will do to the permanents picked here (`chooseTargets` only). */
    targetFate?: TargetFate;
    promptKey?: "activateBlitz";
  };
}

export type DecisionKind = DecisionRequest["kind"];

/**
 * Runtime enumeration of TargetFate, pinned to the type the same way DECISION_KINDS
 * is: a fate added to the union without a client badge fails typecheck here.
 */
export const TARGET_FATES = [
  "delete",
  "trash",
  "returnToHand",
  "returnToDeck",
  "returnToEggDeck",
  "suspend",
  "unsuspend",
  "digivolve",
] as const satisfies readonly TargetFate[];

type _TargetFatesComplete = Exclude<TargetFate, (typeof TARGET_FATES)[number]> extends never ? true : never;
const _targetFatesComplete: _TargetFatesComplete = true;
void _targetFatesComplete;

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
