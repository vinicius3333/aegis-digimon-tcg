import type {
  CardColor,
  CardDefinition,
  CardInstance,
  DisableTiming,
  EffectDuration,
  EffectTiming,
  GameState,
  Permanent,
  PlayerState,
  Seat,
  TargetFate,
  ZoneRef,
  ActivateForeignEffectOverrides,
} from "@aegis/shared";
import type { CardSource } from "./CardSource.js";
import type { PlayMatch } from "./continuous.js";
import type { EvoCostMatch } from "./modifiers.js";

/**
 * Continuous "can't ..." prohibitions a permanent can carry that the engine actually HONORS
 * (static-continuous-effects). Defined here (the primitives contract) so both the ledger impl
 * and the verbs agree.
 *
 * `restrict()` accepts only these. That is the point of the split: five members of this union
 * once had zero consumers, so 41 card modules recorded protection the engine never read — a
 * type-safe call that silently did nothing. `restrictionConsumers.guard.test.ts` fails the
 * build if a member ever loses its consumer again, and a kind with no consumer belongs in
 * {@link DeprecatedRestriction} where `restrict()` cannot reach it.
 */
export type EnforcedRestriction =
  | "attack"
  | "attackPlayers"
  | "cantAttackDigimon"
  | "attackOnlySuspendedDigimon"
  | "block"
  | "cantBeBlocked"
  | "cantBeBlockedByNoDigivolution"
  | "suspend"
  | "unsuspend"
  | "unsuspendDuringOwnUnsuspendPhase"
  | "unsuspendDuringUnsuspendPhase"
  | "unsuspendHandTrashCost"
  | "beDeletedInBattle"
  | "beDeleted"
  | "beSuspended" // "can't be suspended" by effects; combat self-suspend is exempt (BT19-101 KB Q3185)
  | "beTrashed"
  | "beReturned"
  | "leaveBattleAreaExceptByDeletion"
  | "digivolve"
  | "digivolveToLevel7"
  | "attackTargetChange"
  | "cantBeAttacked"
  | "dpImmune"
  | "beAffected"
  | "cantBeDeDigivolved"
  | "cannotActivateWhenDigivolving" // "can't activate [When Digivolving] effects" (BT19-038 KB Q5541–Q5545)
  | "activateOnPlay"; // "can't activate [On Play] effects" (EX8-029)

/**
 * Kinds the ledger still stores but nothing honors. `restrict()` rejects them, so a card
 * cannot record one; they exist only so the ~32 not-yet-re-classified IR card records keep
 * type-checking against {@link Restriction}.
 *
 * `activateEffects` is superseded by the dedicated disableSecurityEffect /
 * disableTimingEffect verbs.
 */
export type DeprecatedRestriction = "activateEffects";

/** Every restriction value the ledger can hold, enforced or not. */
export type Restriction = EnforcedRestriction | DeprecatedRestriction;

/** Future events a delayed/triggered sub-effect can watch (delayed-and-rule-effects). */
export type SubTriggerEventName =
  // Every actual entry into the battle area; mirrors OnEnterFieldAnyone rather
  // than the narrower whenPlayed bus (which excludes breeding movement/digivolve).
  | "onEnterFieldAnyone"
  | "whenAttacking"
  | "whenOpponentAttacks"
  | "whenBlocked"
  | "whenBlockerActivated"
  | "whenAttackTargetSwitched"
  | "whenSuspended"
  | "whenUnsuspended"
  | "whenBattleWon"
  | "whenSecurityBattleEnded"
  | "whenDeletesInBattle"
  | "whenOneOfYoursDigivolves"
  | "whenAnyDigivolves"
  | "whenHatch"
  | "whenMovedFromBreeding"
  | "whenOpponentMovedFromBreeding"
  | "onDeletionOf"
  | "whenSecurityRemoved"
  | "whenCardTrashedFromSecurity"
  | "whenEffectTrashesFromSecurity"
  | "whenEffectRemovesFromSecurity"
  | "whenAddSecurity"
  | "whenFaceUpCardsAddedToOpponentSecurity"
  | "onAddDigivolutionCards"
  | "whenPlayed"
  | "whenOptionPlayed"
  | "whenOptionInBattleAreaTrashed"
  | "whenLeavesPlay"
  | "whenLinked"
  | "whenLinkTrashed"
  | "whenDigivolutionTrashed"
  | "onDigivolutionCardDiscarded"
  | "onDigivolutionCardsDiscardedBatch"
  | "onDigiBurstCardDiscarded"
  | "onDigivolutionCardReturnToDeckBottom"
  | "whenTrashedFromHand"
  | "whenHandTrashed"
  | "onDiscardLibrary"
  | "whenOptionUsed"
  | "whenEffectAddsToHand"
  | "whenEffectAddsToOpponentHand"
  | "whenCardReturnsFromTrashToHand"
  | "whenDigimonReturnsToHand"
  | "whenCardReturnsFromTrashToDeck"
  | "whenEffectSuspends"
  | "whenOpponentDraws"
  | "startOfYourMainPhase"
  | "endOfTurn"
  | "endOfOpponentTurn"
  | "wouldBeReturned"
  | "whenTrashedByEffect"
  | "whenTrashedFromDeck"
  | "whenCheckedFaceUpSecurity"
  // The whenEffectAddsToHand sibling for deck-bound moves (returnToDeck). Unblocks
  // BT26-001/BT26-015, which need "an effect adds a card to your deck" as a live event.
  | "whenEffectAddsToDeck";

/** Events a replacement effect can intercept. */
export type ReplacementEventName =
  | "wouldLeavePlay"
  | "wouldBeDeleted"
  | "wouldBePlayed"
  | "wouldDigivolve"
  /**
   * A digivolution-card trash is about to select which cards to take from one or more host
   * permanents (BT10-084 Tactimon; KB Q2002-Q2008). Consulted BEFORE the specific instance ids
   * are chosen — see `ReplacementInstallRedirect`.
   */
  | "wouldTrashDigivolutionCard";

/**
 * Why a permanent is leaving the battle area, passed to the leave-prevention consult so
 * a "prevent" reaction can gate on the removal cause (e.g. "by an opponent's effect" must
 * not fire on the controller's own deletion). `byEffect` carries the resolving seat (whose
 * effect drove the removal); `byBattle` is combat deletion; `byRule` is a rule-based removal.
 */
export type RemovalCause = "byEffect" | "byBattle" | "byRule";

/**
 * Event-time proof that an inherited source was discarded from a live host.
 * This is deliberately separate from deletion snapshots: discarding a
 * digivolution card is not a deletion event, but its inherited watcher still
 * needs a narrowly scoped placement proof after the source leaves the stack.
 */
export interface DiscardedStackSourceProof {
  sourceInstanceId: string;
  hostPermanentId: string;
}

/**
 * What happened at the timing window that is firing. TS replacement for the
 * source `Hashtable` carried through effect resolution. Extend per timing as
 * the card implementation surfaces the data each effect reads (card-module contract
 * sections 2 and 10).
 */
export interface TriggerInfo {
  /** Stack-effect conferrals captured before a deleted host leaves play (Q2214). */
  stackEffectConferralsSnapshot?: readonly {
    targetPermanentId: string;
    stackInstanceId: string;
    trigger?: string;
    excludeInherited?: boolean;
    inheritedOnly?: boolean;
  }[];
  /** Named effect grants captured at the same pre-deletion boundary. */
  customEffectGrantsSnapshot?: readonly {
    grantId?: number;
    instanceId: string;
    token: string;
    /** Live gate for duration-scoped auras whose recipient can gain/lose effect immunity. */
    isActive?: () => boolean;
  }[];
  /** On-deletion-at-end-of-attack projections captured before deletion teardown. */
  onDeletionAtEndOfAttackProjectionsSnapshot?: readonly string[];
  /** The play was initiated by an explicitly marked Decode replacement payload. */
  playedByDecode?: boolean;
  /** Seat whose turn was active when the event occurred (preserved across deferred rule triggers). */
  turnSeat?: Seat;
  /** Controller of a deleted permanent, captured before deferred rule processing removes it. */
  deletedControllerSeat?: Seat;
  /** Card id being played during the pay-time cost window. */
  wouldBePlayedCardId?: string;
  /** Whether the pay-time declaration is using the card as an Option rather than playing a permanent. */
  wouldBePlayedAsOption?: boolean;
  attackerPermanentId?: string;
  /** Attacker's effective DP immediately after declaration/suspension, before [When Attacking] effects. */
  attackerDPAtDeclaration?: number;
  /** Stable identity for this attack across all reactive attack sub-trigger fires. */
  attackSequence?: number;
  /** Named attack procedure that caused the current attack watcher, when applicable. */
  attackMechanic?: string;
  /** The defending permanent of the in-flight battle (the original target or the blocker). */
  defenderPermanentId?: string;
  /** Permanent whose currently resolving effect or battle deleted the event subject. */
  deletingPermanentId?: string;
  /** The Digimon that declared a block this battle (＜Blocker＞ window). */
  blockerPermanentId?: string;
  targetPermanentId?: string;
  drawnInstanceIds?: string[];
  /** Permanent about to be deleted (WhenPermanentWouldBeDeleted). */
  deletedPermanentId?: string;
  /** Every permanent in the same simultaneous deletion action, captured before movement. */
  deletedPermanentIds?: string[];
  /** Controller and top-card facts for every permanent in the simultaneous deletion action. */
  deletedPermanentSnapshots?: Array<{ permanentId: string; controllerSeat: Seat; topCardId: string }>;
  /** Physical cards that became link cards in the current linking operation. */
  linkedInstanceIds?: string[];
  deletedInstanceIds?: string[];
  /** Printed card id of the deleted permanent's top card, captured before it leaves play. */
  deletedTopCardId?: string;
  /** Number of digivolution cards under the deleted permanent, captured before it leaves play. */
  deletedDigivolutionCardCount?: number;
  /** Effective host colors captured before deletion, keyed by every moved card instance. */
  deletedEffectiveColorsByInstanceId?: Record<string, import("@aegis/shared").CardColor[]>;
  /**
   * The subset of {@link deletedInstanceIds} that were STACK cards (not top cards)
   * of the deleted permanents. Used by the placement guard to distinguish inherited
   * effects (which fire only from stack position) from top-card effects after the
   * permanent is gone.
   */
  deletedWasStackInstanceIds?: string[];
  /** Subset of deletedInstanceIds that were linked cards before their host left play. */
  deletedWasLinkedInstanceIds?: string[];
  /**
   * Deleted host top-card instance keyed by each linked card that left with it. A linked
   * [On Deletion] effect stays pending for the host card, not the link card (BT24-036 Q5615),
   * so the host must still be in trash when that pending effect would activate.
   */
  deletedLinkHostInstanceByLinkedInstanceId?: Record<string, string>;
  /** Battle opponent for each card instance deleted in a battle. */
  battleOpponentPermanentIdByInstanceId?: Record<string, string>;
  /** Snapshot of effective battle-deletion Retaliation holders and their opponents. */
  retaliationTargetsByInstanceId?: Record<string, string>;
  /** Event-time Fortitude holders that had digivolution cards when deleted. */
  fortitudeInstanceIds?: string[];
  /** Deleted host top-card identity for every card moved with it; pending effects require that host in trash. */
  deletedHostInstanceByInstanceId?: Record<string, string>;
  /** Why the cards in this deletion window left play. */
  removalCause?: RemovalCause;
  /** Named procedure that caused the deletion, when the rules distinguish it. */
  removalMechanic?: "Overclock";
  /** True when this simultaneous deletion batch is the rule check for Digimon at exactly 0 DP. */
  deletedByDpZero?: boolean;
  /** Top-card instance IDs that individually reached exactly 0 DP in this deletion window. */
  deletedByDpZeroInstanceIds?: string[];
  /** Security card currently being checked. */
  securityInstanceId?: string;
  /** Option permanent card instance that was trashed from the battle area. */
  trashedOptionInstanceId?: string;
  /** The checked security card was face-up before the check revealed it. */
  securityWasFaceUp?: boolean;
  /** Permanent that was suspended (OnTappedAnyone). */
  suspendedPermanentId?: string;
  /**
   * Permanent that just transitioned from suspended to unsuspended (whenUnsuspended).
   * Set only on an ACTUAL transition — an already-unsuspended permanent never fires this
   * (mirrors suspendedPermanentId's "actual transition" gate, KB ST18-10 read in reverse).
   * Covers every unsuspend seam: the turn-start unsuspend phase (§6-2), ＜Reboot＞ (§16-11),
   * and effect-driven Unsuspend actions.
   */
  unsuspendedPermanentId?: string;
  /**
   * The seat whose EFFECT drove an effect-suspension (whenEffectSuspends). A watcher gated on
   * `EffectSourceCard.Owner == card.Owner`) reads this to require the suspending effect was its
   * OWN controller's. Set only on the effect-driven suspend seam, never on combat suspension.
   */
  effectSuspendSeat?: Seat;
  /**
   * The cardId of a digivolution-stack card just placed at the bottom of its owner's deck
   * (onDigivolutionCardReturnToDeckBottom). The watcher gates on this card's name (BT11-065:
   * "[Vemmon]") while `subjectPermanentId` carries the host whose stack lost the card.
   */
  returnedToDeckCardId?: string;
  /** Seat whose trash supplied at least one card just returned to its deck. */
  returnedFromTrashToDeckSeat?: Seat;
  /**
   * whenPlayed: the play that drove this event was EFFECT-driven (the `playInstances` verb — e.g.
   * "play a Digimon from trash/hand by an effect"), not a manual hand play. A watcher for "when an
   * effect plays one of your Digimon" (EX5-062, KB Q3665) gates on this; a manual play leaves it
   * unset, and a digivolve never fires whenPlayed at all.
   */
  playedByEffect?: boolean;
  /** Card whose resolving effect performed this play (for exact producer gates such as EX3-025). */
  playedByEffectSourceCardId?: string;
  /**
   * Printed level of the Digimon whose effect-driven play fired `whenPlayed`, captured at the
   * play seam before On Play effects or other simultaneous effects can change/remove it.
   */
  playedLevel?: number;
  /** Printed play cost captured when the `whenPlayed` event was produced. */
  playedPlayCost?: number;
  /** Permanent that just moved breeding -> battle area (OnMove). */
  movedPermanentId?: string;
  /** Why an OnEnterFieldAnyone subject entered the battle area. */
  entryCause?: "play" | "digivolve" | "move";
  /**
   * The permanent whose ENTRY drove this SubTrigger event — the played card
   * (whenPlayed), the linked/host card (whenLinked / whenOneOfYoursDigivolves), or the
   * permanent that gained digivolution cards (onAddDigivolutionCards). A filtered
   * sub-trigger's `matches` predicate reads this to gate ("a green Tamer was played").
   */
  subjectPermanentId?: string;
  /**
   * Every permanent created by one simultaneous play operation. `subjectPermanentId`
   * remains the first entry for legacy single-subject consumers; effects that say
   * "1 of those Digimon" use this collection to offer the complete event-bound choice.
   */
  subjectPermanentIds?: string[];
  /** Card instances linked by the current operation (whenLinked). This lets a newly linked
   * card's own [When Linking] watcher join the recipient's simultaneous trigger window. */
  linkedCardInstanceIds?: string[];
  /** Card instances just added to the subject permanent's digivolution stack. */
  addedDigivolutionCardInstanceIds?: string[];
  /** Stack position used by an effect placing cards under a Digimon. */
  addedDigivolutionCardsPosition?: "top" | "bottom";
  /** True when an effect rotated the host's own top card to the bottom of its stack. */
  placedOwnTopAtStackBottom?: boolean;
  /** Printed card id selected as the destination of an imminent digivolution. */
  digivolvingIntoCardId?: string;
  /** Printed level of the permanent's top card immediately before a digivolution. */
  previousDigivolutionLevel?: number;
  addedToHand?: {
    instanceIds: string[];
    byEffect?: { ownerSeat: Seat; isDigimonEffect: boolean };
  };
  addedToSecuritySeat?: Seat;
  /**
   * The card instances just placed into the security stack (whenAddSecurity). A watcher reads
   * these to gate on the added cards' traits ("if any of them have the [Zaxon]/[Royal Base]
   * Empty/absent for a ＜Recovery＞-style face-down add (the trait gate then never holds).
   */
  addedToSecurityInstanceIds?: string[];
  /**
   * The seat whose security stack a resolving EFFECT just removed cards from
   * effect removes cards from YOUR security" (BT15-084) reads this to require the removal hit
   * its own controller's stack rather than the opponent's.
   */
  removedFromSecuritySeat?: Seat;
  /** True when an effect, rather than a security check, removed the card. */
  securityRemovedByEffect?: boolean;
  /** Card instances just trashed from a security stack. */
  trashedFromSecurityInstanceIds?: string[];
  /**
   * The seat whose EFFECT drove the digivolution-card trash (whenDigivolutionTrashed). A
   * watcher gated on "when YOU trash a digivolution card" (KB P-004) reads this to require
   * the trashing effect was its OWN controller's, not the opponent's.
   */
  byEffectSeat?: Seat;
  /** Printed card ID of the effect that produced the event, when known. */
  byEffectCardId?: string;
  /** Whether the trashed digivolution card was the top card of its stack. */
  trashedDigivolutionCardWasTop?: boolean;
  /** True only when a digivolution card was trashed to pay a ＜Digi-Burst＞ cost. */
  isDigiBurstTrash?: boolean;
  /**
   * The seat whose HAND was just trashed from (one or more cards moved from that seat's hand to
   * trash in a single trash action). A `whenHandTrashed` watcher ("[All Turns] when YOUR hand is
   * trashed from", BT25-084) gates on this equalling its own controller's seat. Fired ONCE per
   * trash action per affected seat regardless of how many cards left (KB Q6400/Q6401: trashing 2
   * in one action triggers once; trashing 1 twice triggers twice).
   */
  handTrashedSeat?: Seat;
  /** Exact instances moved from that hand by the single trash action. */
  handTrashedInstanceIds?: string[];
  /**
   * The card ID of a card directly trashed from its owner's hand by an effect. Fired once per
   * moved hand card. Use `trashedFromHandInstanceId` for "this card" identity; duplicate copies
   * share this printed ID.
   */
  trashedFromHandCardId?: string;
  /** Exact instance directly trashed from hand; binds self-referential hand watchers. */
  trashedFromHandInstanceId?: string;
  /**
   * The seat whose EFFECT drove this card's ENTRY into the battle area for the OnPlay /
   * WhenDigivolving window — i.e. the card was played or digivolved BY AN EFFECT, not by a
   * manual hard play/digivolve. A `triggerEnteredByEffect` condition reads it (documented behavior
   * the effect runtime.IsByEffect gating BT25-084's "after, if played or digivolved by an effect,
   * trash their top security"). Unset for a manual play/digivolve and for every other timing
   * (so a When Attacking window can never satisfy the gate).
   */
  enteredByEffect?: Seat;
  /**
   * True when the WhenDigivolving window was reached via a DNA digivolve (two material Digimon
   * merged), set by the DNA-digivolve fire seam. An `isDnaDigivolving` condition reads it to gate a
   * DNA-only branch (BT20-045, P-221, EX9-021). Unset for a single digivolve and every other timing.
   */
  isDnaDigivolve?: boolean;
  /**
   * Source zone of the card that caused the current WhenDigivolving window, when known.
   * Effect-driven digivolves set this from the loose instance's pre-move zone so cards can
   * distinguish "this digivolved from the trash" (BT17-065).
   */
  digivolvedFromZone?: ZoneRef;
  /**
   * The rules-relevant use cost of the Option whose use fired this event: after card-level
   * changes, but before payment-only reductions (BT10-032 Q1956/Q1957).
   */
  usedOptionCost?: number;
  /**
   * The instance id of a digivolution card specifically trashed (onDigivolutionCardDiscarded).
   * Carried alongside subjectPermanentId (the host permanent) so a watcher's sourceFilter can
   * gate on "THIS card specifically" (the isSelfRef pattern BT10-006 uses).
   */
  trashedDigivolutionInstanceId?: string;
  /** All sources trashed simultaneously by one Digi-Burst cost payment. */
  trashedDigivolutionInstanceIds?: string[];
  /** Subset that was face down immediately before the stack-to-trash move. */
  trashedFaceDownDigivolutionInstanceIds?: string[];
  /**
   * The seat that just drew one or more cards (whenOpponentDraws). A watcher
   * ("[Your Turn] / [All Turns] when your opponent draws a card") gates on this
   * being the OPPONENT of its own controller's seat.
   */
  drawingSeat?: Seat;
  /**
   * The seat whose hand an EFFECT just added one or more cards to
   * (whenEffectAddsToOpponentHand). Distinct from `drawingSeat`: this fires for any
   * effect-driven hand addition (effect Draw, Return-to-hand, RevealAdd-to-hand) but
   * NOT for the normal draw-phase draw (a game rule, not an effect). A watcher ("[All
   * Turns] when an effect adds cards to your opponent's hand") gates on this being the
   * OPPONENT of its own controller's seat.
   */
  effectAddedToHandSeat?: Seat;
  /**
   * Number of material cards used in the DigiXros that triggered the current OnPlay window.
   * Set by the DigiXros fire seam; absent for a non-DigiXros play and every other timing.
   * A `digiXrosCount` condition reads this to gate "DigiXrosing with N or more cards".
   */
  digiXrosMaterialCount?: number;
  /**
   * The zone a card was played FROM when a `whenPlayed` event fires via an effect
   * (`playInstances`). Set to `"digivolutionCards"` when the played card originated from
   * a battle-area permanent's digivolution stack. Absent for hand plays and every other
   * timing. A `fromDigivolution: true` sourceFilter reads this to gate on "played from
   * digivolution cards" (BT20-028 KB Q4321).
   */
  playedFromZone?: string;
  /**
   * The destination a permanent WOULD BE returned to when a `wouldBeReturned` SubTrigger
   * event fires (CAP-C-11). Set to `"hand"` or `"deck"` by the return primitives before
   * executing the move. A `returnDestination` sourceFilter reads this to restrict which
   * destinations arm the watcher (BT20-074: "hand" or "deck" only, not trash).
   */
  returnDestination?: "hand" | "deck" | "trash";
  /**
   * The permanent trashed by an effect that fired a `whenTrashedByEffect` SubTrigger event
   * (CAP-E8, BT19-093). Carried so the watcher's `sourceFilter.zone` gate can check which
   * zone the permanent was in when trashed. Set by the effect-trash seam in primitives.ts
   * before the subscription is consulted; absent for every other event type.
   */
  trashedByEffectPermanentId?: string;
  /**
   * The instance id of the card BEING PLAYED when a `wouldBePlayed` Replacement fires.
   * Set by the play-card path before consulting `instead` replacements so an action with
   * `underFilter.isTriggerSource: true` can resolve the host to the played Digimon
   * (BT19-081: "place cards from under your Tamers as DigiXros materials for this Digimon").
   */
  wouldBePlayedInstanceId?: string;
  /**
   * The card ID of a card directly trashed from a player's deck (whenTrashedFromDeck, CAP-H-01).
   * Fired once per milled card (unlike onDiscardLibrary which fires once per mill action).
   * A `whenTrashedFromDeck` watcher with `sourceFilter.isSelfRef` gates on this card ID
   * matching its own source card ID ("when THIS card is trashed from the deck").
   */
  trashedFromDeckCardId?: string;
  /** Card ID of the effect source that caused this deck trash, when known. */
  trashedFromDeckByEffectCardId?: string;
  /**
   * The seat whose deck an EFFECT just added one or more cards to (whenEffectAddsToDeck).
   * The whenEffectAddsToHand sibling for deck-bound returns (returnToDeck). A watcher gates
   * on this equalling its own controller's seat (or the opponent's) exactly like
   * `effectAddedToHandSeat`.
   */
  effectAddedToDeckSeat?: Seat;
  /** Controller of the resolving effect that added cards to a deck, when known. */
  effectAddedToDeckBySeat?: Seat;
  /**
   * The seat whose trash cards were just returned FROM, to hand (whenCardReturnsFromTrashToHand).
   * A watcher ("[All Turns] when a card returns from your trash to your hand", BT15-082) gates
   * on this equalling its own controller's seat.
   */
  returnedFromTrashSeat?: Seat;
  /**
   * The card IDs of the cards that just returned from trash to hand in the same move as
   * `returnedFromTrashSeat`. A sourceFilter reads these (via `getCardDefinition`) to gate on
   * the returned cards' colors/traits (BT15-082: "a Red Digimon returns from your trash").
   */
  returnedFromTrashCardIds?: string[];
  /** Digimon card instances that just returned to their owner's hand from any zone. */
  returnedDigimonToHandSeat?: Seat;
  returnedDigimonToHandInstanceIds?: string[];
  // TODO(effect-framework): add fields as more timings are implemented.
}

/** Read-only access to authoritative state for guards and effect bodies. */
export interface GameAccess {
  readonly state: GameState;
  player(seat: Seat): PlayerState;
  opponentOf(seat: Seat): Seat;
  permanentById(permanentId: string): Permanent | undefined;
  /**
   * Only `cardId` is read, so a bare `{ cardId }` — a loose-card candidate, a recorded trigger
   * subject — is a legal argument without materializing a whole {@link CardInstance}.
   */
  definitionOf(card: Pick<CardInstance, "cardId">): CardDefinition;
  /**
   * A permanent's EFFECTIVE link limit: base 1 plus every
   * active `<Link +N>` grant. Server-authoritative; `runLink` reads it to cap link cards.
   * Optional so lightweight test GameAccess literals need not supply it (callers fall back
   * to the base limit when absent); the live engine always provides it via createGameAccess.
   */
  linkMax?(permanent: Permanent): number;
  /**
   * The link-cost reduction that applies when a card carrying `cardTraits` would link to
   * `recipientId`. Returns the
   * LARGEST single matching grant — reductions do NOT stack on one declaration (KB BT25-089
   * Q6423). Optional for lightweight test literals (callers fall back to 0 when absent); the
   * live engine always supplies it via createGameAccess from the continuous ledger.
   */
  linkCostReduction?(recipientId: string, cardTraits: readonly string[]): number;
  linkCostReductionGrant?(
    recipientId: string,
    cardTraits: readonly string[],
  ):
    | {
        amount: number;
        controllerSeat?: Seat;
        optional?: boolean;
        oncePerTurnKey?: string;
      }
    | undefined;
  /**
   * A permanent's EFFECTIVE card kinds (static def.kinds ∪ continuous KindGrants).
   * A Tamer granted Digimon kind via grantKind is a Digimon for type-check gates
   * (HARD-01). Optional so lightweight test GameAccess literals fall back to static
   * kinds; the live engine always provides it via createGameAccess.
   */
  effectiveKinds?(
    permanentId: string,
    printedKinds?: readonly import("@aegis/shared").CardKind[],
  ): import("@aegis/shared").CardKind[];
  /** A permanent's printed traits plus active runtime trait grants. */
  effectiveTraits?(permanentId: string): string[];
  /** A permanent's printed kinds plus active runtime kind grants. */
  effectiveKinds?(
    permanentId: string,
    printedKinds?: readonly import("@aegis/shared").CardKind[],
  ): import("@aegis/shared").CardKind[];
  /** A permanent's effective name set, including dynamic aliases from its digivolution stack. */
  effectiveNames?(permanent: Permanent): string[];
  /** Effective printed-plus-granted colors used by Option color requirements. */
  effectiveColors?(permanent: Permanent): import("@aegis/shared").CardColor[];
  /** Current DP including active continuous modifiers during effect recomputation. */
  effectiveDP?(permanentId: string): number;
  /** Whether a loose card currently ignores its printed color requirement. */
  colorRequirementWaived?(instanceId: string): boolean;
  /** Whether an Option can currently be used under its ordinary color requirement. */
  optionColorRequirementMet?(seat: Seat, instanceId: string, definition: CardDefinition): boolean;
  /** Server-authoritative live keyword/mechanic lookup for the source permanent. */
  hasKeyword?(permanentId: string, keyword: string): boolean;
  /** Whether the permanent can currently declare an ordinary (tapping) attack. */
  canDeclareAttack?(permanent: Permanent): boolean;
  /** Whether `seat` completed a digivolution since the current turn began. */
  digivolvedThisTurn?(seat: Seat): boolean;
  /** A live battle-area base-granted evolution path, usable by effect-driven digivolution. */
  baseGrantedDigivolve?(seat: Seat, base: Permanent, evolving: CardDefinition): { cost: number } | undefined;
  /** Whether the permanent is currently prevented from activating this timing. */
  isTimingEffectDisabled?(permanentId: string, timing: "whenDigivolving" | "whenAttacking" | "onPlay"): boolean;
}

/**
 * The effect verbs (card-module contract). Each is the direct analogue of an
 * source the effect runtime / the effect factory operation; each mutates
 * authoritative state and emits the right events.
 *
 * Implemented by `createPrimitives` in `engine/effects/primitives.ts`, wired into
 * GameEngine. Signatures below are the contract card modules are written against.
 */
export interface Primitives {
  draw(seat: Seat, n: number, opts?: { excludeInstanceIds?: readonly string[] }): Promise<CardInstance[]>;
  gainMemory(n: number): void;
  /** Gain memory for a specific seat (effect controller), with Tamer-effect policy check. */
  gainMemoryForSeat(seat: Seat, n: number, opts?: { isTamerEffect?: boolean }): void;
  restrictMemoryGain(seat: Seat, duration: EffectDuration): void;
  restrictCostReduction(seat: Seat, costType: "play" | "digivolve" | "all", duration: EffectDuration): void;
  /** Restrict a seat from digivolving its unsuspended Digimon for a bounded duration. */
  restrictUnsuspendedDigivolve(seat: Seat, sourceSeat: Seat, duration: EffectDuration): void;
  /**
   * Record a seat-level play/move prohibition (rule implementation / rule implementation /
   * rule implementation): the restricted `seat` may not play/move a card matching `match` for
   * `duration`. Only the RESTRICTED seat's own actions/effects are blocked (the source
   * player's effects may still play such cards), and token plays are exempt unless the match
   * opts into them (KB EX7-014 Q4673-4676/Q3834; BT14-017/Q2381). Consulted by play-card /
   * breeding-move legality and effect-driven plays.
   * When `byEffectOnly` is true the prohibition applies only to effect-driven plays, leaving
   * normal hand play unaffected (KB Q4665–Q4668, Q6245 BT20-020).
   */
  restrictPlay(
    seat: Seat,
    sourceSeat: Seat,
    match: PlayMatch,
    mode: "play" | "move" | "playOrMove",
    duration: EffectDuration,
    byEffectOnly?: boolean,
  ): void;
  /**
   * Read-only query: is `seat`'s own action/effect forbidden from playing/moving `cardId`
   * right now by an active RestrictPlay prohibition? Used by the interpreter to gate an
   * EFFECT-driven play attributed to the resolving effect's owner seat — so a "your opponent
   * can't play <X>" effect blocks the opponent's effects (Q4676) but not the source player's
   * (Q4675). Token plays return false (exempt by default, Q3834) unless the active match opts into tokens
   * (BT14-017/Q2381). Optional on the port (test fakes skip).
   */
  isPlayProhibited?(seat: Seat, cardId: string, mode: "play" | "move", fromZone?: ZoneRef): boolean;
  /**
   * Record a security-effect disable on `attackerPermanentId` (the security half of the
   * source rule implementation split): while that permanent is the attacker, a flipped
   * security card's [Security] effect does not activate. `sourceKind` "option" suppresses
   * only Option security effects; "any" suppresses any.
   * Consulted in the security-check resolution loop; the card is still trashed (KB Q886).
   */
  disableSecurityEffect(attackerPermanentId: string, sourceKind: "option" | "any", duration: EffectDuration): void;
  /** Suppress matching Security effects for every attacker controlled by this seat. */
  disableSecurityEffectsForSeat(attackerSeat: Seat, sourceKind: "option" | "any", duration: EffectDuration): void;
  /**
   * Record a timing-effect disable on `permanentId` (the timing half of the source
   * rule implementation split): the masked [When Digivolving] / [When Attacking] / [On Play]
   * effects of that permanent do not activate. Consulted by the per-effect activation gate,
   * honoring the `beAffected` effect-immunity exception.
   */
  disableTimingEffect(permanentId: string, timings: DisableTiming[], duration: EffectDuration): void;
  /** Read the effective timing-disable state from the authoritative continuous ledger. */
  isTimingEffectDisabled?(permanentId: string, timing: DisableTiming): boolean;
  declareWinner(seat: Seat): void;
  setMemory(v: number): void;
  /** Raise/set a specific seat's memory from that seat's perspective when the action targets it. */
  setMemoryForSeat?(seat: Seat, value: number): void;
  /** Raise the active turn-end threshold for this effect's controller (BT14-081). */
  setTurnEndMinMemory?(seat: Seat, minimum: number): void;
  modifyDP(
    permanentId: string,
    delta: number,
    duration: EffectDuration,
    opts?: {
      continuous?: boolean;
      sourceInstanceId?: string;
      sourceSeat?: Seat;
      sourceKinds?: string[];
      skipsCurrentOpponentTurnEnd?: boolean;
    },
  ): void;
  /** Modify every current and future Digimon controlled by `seat` for the duration. */
  modifyPlayerDP(
    seat: Seat,
    delta: number,
    duration: EffectDuration,
    opts?: {
      ownerSeat?: Seat;
      sourceSeat?: Seat;
      sourceKinds?: string[];
      skipsCurrentOpponentTurnEnd?: boolean;
    },
  ): void;
  /** Restore DP already reduced before a newly gained reduction immunity takes effect (Q1990). */
  restoreDpReductions(permanentId: string): void;
  /**
   * Override a permanent's ORIGINAL/base DP to an absolute value for `duration`
   * (the "treated as having N DP" family). Replaces the base DP that signed
   * `modifyDP` deltas then sum onto; latest override wins between competing ones.
   */
  setBaseDP(permanentId: string, value: number, duration: EffectDuration): void;
  playFromHand(
    instanceIds: string[],
    opts?: { payCost?: boolean; suspended?: boolean; costDelta?: number },
  ): Promise<Permanent[]>;
  playFromSecurity(instanceId: string, opts?: { payCost?: boolean }): Promise<Permanent | undefined>;
  /**
   * Read-only affordability query for an effect-driven paid play. Resolves the same
   * continuous play-cost modifiers and explicit reduction as `playInstances`, without
   * moving the card or paying memory. Optional so narrow interpreter test ports may omit it.
   */
  canAffordEffectPlay?(
    instanceId: string,
    opts?: { costDelta?: number; useAsOption?: boolean; controllerSeat?: Seat },
  ): Promise<boolean>;
  /** Current play cost of a live permanent after active play-cost modifiers. */
  effectivePlayCost?(permanent: Permanent): number;
  /**
   * Current cost of a loose card when used by its controller, after the same
   * continuous hand-use reductions as an ordinary Option use.
   */
  effectiveLooseUseCost?(instanceId: string, controllerSeat: Seat): number | undefined;
  /**
   * Play specific loose card instances as new battle-area permanents, locating each
   * one wherever it currently sits (hand, trash, deck, security, breeding, or as a
   * digivolution/linked card under another permanent). Generalizes `playFromHand` to
   * the "play 1 [X] from your hand/trash/security/deck/under your Tamers without
   * paying the cost" family (the IR `PlayWithoutCost` filtered/from-zone forms). The
   * caller (interpreter) resolves WHICH instances by filter; this verb moves & plays
   * them. Returns the created permanents.
   */
  playInstances(
    instanceIds: string[],
    opts?: {
      payCost?: boolean;
      suspended?: boolean;
      breeding?: boolean;
      costDelta?: number;
      /** Set the paid play's base cost to this value before continuous modifiers. */
      costOverride?: number;
      suppressOnPlayEffects?: boolean;
      /** Card whose resolving effect initiated this play. */
      effectSourceCardId?: string;
      /** Server-selected DigiXros materials to place before firing this effect-played card's On Play. */
      digiXrosMaterialInstanceIds?: string[];
      /** Assembly materials selected from trash for this effect-driven play. */
      assemblyMaterialInstanceIds?: string[];
      /** Resolved host permanent for stack-origin instances, when the source is a stack zone. */
      hostPermanentIds?: Record<string, string>;
    },
  ): Promise<Permanent[]>;
  /**
   * Place a loose card instance onto `targetPermanentId` as a digivolution (the
   * effect-driven analogue of the digivolve action: the prior top slides under the
   * new top). `payCost` pays the matching printed digivolve cost when set (and the
   * placement is skipped if unaffordable); the default — and the common effect form
   * "digivolve into [X] ... without paying the cost" — is free. Recomputes DP from
   * the new top and carries the base's suspended state. Returns the permanent, or
   * undefined when the target or source instance was not found. It fires the resulting
   * card's [When Digivolving] window after its bonus draw. A reveal-based evolution may
   * supply `beforeWhenDigivolving` when the printed effect requires a revealed remainder
   * to be returned before that window opens (BT1-078 KB Q932).
   */
  digivolveFromInstance(
    targetPermanentId: string,
    sourceInstanceId: string,
    opts?: {
      payCost?: boolean;
      draw?: boolean;
      costDelta?: number;
      costOverride?: number;
      /** Choose a matching alternate digivolution requirement when printed and alternate paths both match. */
      useAlternateCost?: boolean;
      /** Ignore only the level portion of the printed digivolution requirement. */
      ignoreLevel?: boolean;
      /** Temporarily evaluate the base as the printed virtual level/colors (e.g. a Tamer). */
      virtualBase?: { level: number; colors: CardColor[] };
      ignoreRequirements?: boolean;
      beforeWhenDigivolving?: () => Promise<void>;
      suppressWhenDigivolving?: boolean;
    },
  ): Promise<Permanent | undefined>;
  /**
   * DNA-digivolve: consume `materialPermanentIds` (two or more battle-area permanents)
   * and play `resultInstanceId` (a loose card) as a single new permanent that carries
   * all the materials' digivolution cards (and the materials' top cards) under it.
   * `payCost` pays the printed digivolve cost when set. Returns the created permanent,
   * or undefined when fewer than 2 materials resolve or the result instance is missing.
   */
  dnaDigivolveInto(
    materialPermanentIds: string[],
    resultInstanceId: string,
    opts?: { payCost?: boolean; extraMaterialInstanceIds?: string[]; extraMaterialsOnBottom?: boolean },
  ): Promise<Permanent | undefined>;
  /**
   * App Fusion: play the fusion-target card `resultInstanceId` (a loose card in trash/hand)
   * ON TOP of the battle-area Digimon `sourcePermanentId`, the prior top sliding under it as
   * a digivolution card (the same placement as `digivolveFromInstance`, NOT DnaDigivolve — no
   * permanent is consumed off the field). Legality and the paid cost are owned by the TARGET
   * card plus its linked cards must collectively cover >= 2 distinct required names (the top
   * card being one of them). Returns the fused permanent, or undefined when the source/result
   * is missing, the fusion is illegal, or the app-fusion cost is unaffordable.
   */
  appFuseInto(sourcePermanentId: string, resultInstanceId: string): Promise<Permanent | undefined>;
  /**
   * De-Digivolve `n`: for a target permanent, up to `n` times move the current top
   * card to the BOTTOM of its owner's deck and promote the card directly beneath it
   * to be the new top (the Digimon reverts to a lower stage). Stops early when the
   * digivolution stack is empty (a Digimon with no sources is unaffected). Recomputes
   * DP from the new top each step. Returns the instances moved to deck.
   */
  deDigivolve(permanentId: string, n: number, opts?: { byEffectSeat?: Seat; stopAtLevel?: number }): CardInstance[];
  /**
   * Place loose card instances under `targetPermanentId` as digivolution cards
   * (beneath its current top — i.e. at the bottom of the stack by default, or just
   * below the top when `belowTop`). Used by "place [X] under ..." / "place as the
   * bottom digivolution card". Returns the instances placed.
   */
  placeUnder(
    targetPermanentId: string,
    instanceIds: string[],
    opts?: { belowTop?: boolean; faceUp?: boolean },
  ): Promise<CardInstance[]>;
  /** Place the controller's deck top face-down under a battle-area permanent. */
  placeUnderFromDeck(targetPermanentId: string, seat: Seat): Promise<CardInstance | undefined>;
  /**
   * "Place this Digimon's top card as its bottom digivolution card" (BT22-043/044): rotate the
   * permanent's own top card to the bottom of its digivolution stack, promoting the topmost
   * digivolution card to the new top. Returns false when there is no digivolution card to
   * promote (the cost is then unpayable).
   */
  placeOwnTopAtStackBottom(permanentId: string): Promise<boolean>;
  /**
   * Relocate a battle-area permanent (top + stack + linked) under another permanent
   * as digivolution cards. The source permanent ceases to exist. `shedOwnCards` is the
   * DigiXros form of §7-2-2-7 (only the top card moves; the rest is trashed) — card effects
   * that place a permanent under another keep the stack and must leave it unset.
   */
  relocatePermanent(
    destPermanentId: string,
    sourcePermanentId: string,
    opts?: { belowTop?: boolean; shedOwnCards?: boolean; faceUp?: boolean },
  ): boolean;
  /**
   * Effect/cost form of `relocatePermanent`: after the move, opens the canonical
   * `onAddDigivolutionCards` window for the destination and awaits its reactions.
   * DigiXros uses the synchronous primitive above because material placement is a rules
   * procedure, not an effect placing a digivolution card.
   */
  relocatePermanentByEffect?(
    destPermanentId: string,
    sourcePermanentId: string,
    opts?: { belowTop?: boolean; shedOwnCards?: boolean; faceUp?: boolean },
  ): Promise<boolean>;
  /**
   * Atomic multi-source form of `relocatePermanentByEffect`. Every source is preflighted
   * before the first permanent leaves play; an invalid source therefore pays nothing and
   * returns an empty list. The returned ids are exactly the source permanents moved.
   */
  relocatePermanentsByEffect?(
    destPermanentId: string,
    sourcePermanentIds: string[],
    opts?: { belowTop?: boolean; shedOwnCards?: boolean; faceUp?: boolean },
  ): Promise<string[]>;
  /**
   * Move a whole permanent (top + digivolution stack + linked cards) across the
   * breeding/battle boundary as a card EFFECT, preserving identity, stack, linked cards
   * and suspended state — digivolution cards are NOT trashed and ＜Overflow＞ is NOT
   * processed (the MovePermanent IR action; Comprehensive Rules §4-16; KB P-143
   * Q4250/Q4251/Q4256/Q4257, P-130 Q4242). NOT the breeding-phase player verb: no
   * Phase.Breeding gate and no once-per-turn breeding limit. Returns false (no-op) when
   * the source is not where `direction` expects or the breeding slot is already occupied.
   */
  movePermanentZone(permanentId: string, direction: "toBreeding" | "toBattle"): Promise<boolean>;
  /**
   * Hatch a Digi-Egg as a card EFFECT: flip the top card of `seat`'s Digi-Egg deck and
   * place it into the EMPTY breeding slot as a fresh permanent (Comprehensive Rules
   * §4-17-1; BT8-091 [On Play]). Returns the new breeding permanent, or undefined when the
   * Digi-Egg deck is empty or the breeding slot is already occupied (breeding is
   * single-occupancy). NOT the breeding-phase player verb (no Phase.Breeding gate).
   */
  hatch(seat: Seat): Permanent | undefined;
  /**
   * Place the TOP card of `seat`'s Digi-Egg deck under `targetPermanentId` as a digivolution
   * card (BT13-007 / EX6-006 "place the top card of your Digi-Egg deck as this Digimon's
   * bottom digivolution card"). By default the card goes to the BOTTOM of the stack;
   * `belowTop` inserts it directly beneath the current top. Returns the placed card, or
   * undefined when the Digi-Egg deck is empty or the host permanent is missing. This is the
   * Digi-Egg-DECK source `placeUnder` (loose-card only) cannot serve.
   */
  placeUnderFromEggDeck(
    targetPermanentId: string,
    seat: Seat,
    opts?: { belowTop?: boolean },
  ): Promise<CardInstance | undefined>;
  /**
   * Place the TOP card of `seat`'s Digi-Egg deck as `targetPermanentId`'s TOP digivolution card
   * (BT22-007 "place [Mother Eater]s as this Digimon's TOP digivolution cards"). The TOP variant
   * of `placeUnderFromEggDeck`: the card goes to the topmost digivolution position and is REVEALED
   * (face-up — KB Q4856). Returns the placed card, or undefined when the Digi-Egg deck is empty or
   * the host permanent is missing.
   */
  placeAsTopFromEggDeck(targetPermanentId: string, seat: Seat): Promise<CardInstance | undefined>;
  /**
   * Link loose card instances to `targetPermanentId` (the Link mechanic — the cards
   * join the permanent's `linked` list). Returns the instances linked.
   */
  link(targetPermanentId: string, instanceIds: string[]): Promise<CardInstance[]>;
  /**
   * Trash loose card instances. Async because trashing a card that sits as a LINK card fires
   * the whenLinkTrashed SubTrigger (KB EX10-062/EX10-073) — the watcher body is awaited so it
   * sequences before control returns (WR-01). Non-link trashes resolve synchronously-fast.
   */
  trash(instanceIds: string[], opts?: { byEffectSeat?: Seat; byRule?: boolean }): Promise<CardInstance[]>;
  /** Trash a breeding permanent as a whole without treating the move as deletion. */
  trashBreedingPermanent?(seat: Seat, opts?: { byEffectSeat?: Seat }): Promise<CardInstance[]>;
  /**
   * Trash digivolution-stack cards (`instanceIds`) of `hostPermanentId` BY AN EFFECT, firing the
   * whenDigivolutionTrashed SubTrigger once per card actually trashed (carrying the host as the
   * subject so a watcher can gate on "an opponent's Digimon"). This is the genuine effect-trash
   * site (KB P-004 Q4113); a return-to-hand bounce that clears digivolution cards uses a separate
   * path and does NOT fire this. Returns the instances trashed.
   */
  trashDigivolutionCards(
    hostPermanentId: string,
    instanceIds: string[],
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string; isDigiBurst?: boolean },
  ): Promise<CardInstance[]>;
  /**
   * Atomically trash exactly `exactCount` selected digivolution cards across one or more hosts.
   * Every host/card/restriction is validated before any card moves or watcher fires; if any
   * selection is stale, duplicated, missing, or protected, nothing moves and `[]` is returned.
   */
  trashDigivolutionCardsAtomic(
    selections: { hostPermanentId: string; instanceId: string }[],
    exactCount: number,
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string; isDigiBurst?: boolean },
  ): Promise<CardInstance[]>;
  /** Whether this exact stacked card can currently be trashed by an effect. */
  canTrashDigivolutionCard?(instanceId: string): boolean;
  /**
   * Consult active digivolution-card-trash "redirect" replacements (BT10-084 Tactimon; KB
   * Q2002-Q2008) for a trash operation about to target `hostPermanentIds`, BEFORE the specific
   * cards to trash are selected. Every caller that is about to trash digivolution cards "by an
   * effect" from one or more hosts (not a self-paid cost trashing its OWN stack for a keyword
   * like ＜Fragment＞/＜Armor Purge＞) must route the resolved host id(s) through this first and
   * use the RETURNED ids for its top/bottom/choose/amount selection — that ordering is what
   * preserves count and selection semantics across the redirect (see
   * `ReplacementInstallRedirect`'s doc comment). Returns `hostPermanentIds` unchanged when no
   * reaction is installed, not every host is eligible, or the controller declines; returns a
   * single-element array (the redirect target) when accepted — a redirect always collapses the
   * WHOLE operation onto the one reacting Digimon (KB Q2004).
   */
  redirectDigivolutionTrashHosts(hostPermanentIds: string[]): Promise<string[]>;
  /**
   * ＜Armor Purge＞'s cost (Comprehensive Rules §16-19-1): trash this permanent's own current
   * top card, promoting the digivolution card directly beneath it to the new top. Requires
   * >= 1 digivolution card to promote; returns undefined (cost unpayable) otherwise.
   */
  armorPurge(permanentId: string): Promise<CardInstance | undefined>;
  /**
   * ＜Ascension＞'s reaction (Comprehensive Rules §16-43-1): place a card instance already
   * loose in trash at the TOP of its owner's security stack. Returns false when the instance
   * is not currently loose (already moved elsewhere).
   */
  ascendToSecurity(instanceId: string): Promise<boolean>;
  /**
   * ＜Material Save N＞'s reaction (Comprehensive Rules §16-21): when `permanentId` (a Digimon
   * with this keyword) is deleted, place up to N of its own specified DigiXros-requirement
   * digivolution cards under 1 of the controller's Tamers instead of trashing them. Must be
   * called BEFORE the permanent's cards move to trash. Returns true when it fired.
   */
  materialSave(permanentId: string): Promise<boolean>;
  /**
   * Fire the whenOptionUsed SubTrigger ("when you use an Option card's effect"; BT19-040 token
   * watcher). The use-option-without-cost verb lands in 08-06 and calls this at its produce site;
   * the event member + this fire-hook seam are defined in 08-01 so the watcher substrate exists.
   * `usedInstanceId` (the Option whose effect was used) is carried as the subject; `usedOptionCost`
   * (the rules-relevant use cost) lets a watcher gate on "a cost of 2 or more".
   */
  fireOptionUsed(usedInstanceId: string, usedOptionCost?: number): Promise<void>;
  /**
   * Fire the onDiscardLibrary SubTrigger when cards are milled from a player's deck top
   * (BT14-077 Yuki Tamer watcher). The firing seat (whose deck was milled) and the trashed
   * instance IDs are carried so a watcher can gate on "your opponent's deck was milled."
   */
  fireOnDiscardLibrary(deckSeat: Seat, trashedInstanceIds: string[]): Promise<void>;
  /**
   * Fire the whenTrashedFromDeck SubTrigger once per milled card (CAP-H-01, BT19-097).
   * Carries the card ID of the just-trashed deck card so a watcher with sourceFilter.isSelfRef
   * can match only when its own card ID was the one trashed from the deck.
   */
  fireWhenTrashedFromDeck(cardId: string, instanceId?: string, byEffectCardId?: string): Promise<void>;
  /**
   * "Use 1 Option card from your hand" (BT19-040 and 11 other callers). Resolves the used
   * card's [Main]/`OnUseOption` effect (via `resolveCardEffect`) under the CALLING card's
   * control, then trashes the Option (Options resolve then go to trash — they are not
   * permanents) and fires the `whenOptionUsed` SubTrigger (BT19-040 token watcher). Returns
   * the trashed instances. `usedOptionCost` carries the use cost before any payment-only
   * reduction; free-use and reduced-payment effects therefore preserve it.
   */
  useOptionFromHand(
    ctx: EffectContext,
    usedInstanceId: string,
    usedOptionCost?: number,
    opts?: { payCost?: boolean; costDelta?: number; paymentHandled?: boolean },
  ): Promise<CardInstance[]>;
  /**
   * Run `cardId`'s registered EffectModule effect(s) for `timing`, under `ctx.source`'s control
   * (the effect resolves as if the CALLER were doing it — KB precedent: BT19-040 "use 1 Option
   * from hand"). Looks the module up via the shared `registerCard` registry (`registry.ts`), so
   * it works uniformly for a hand-written OR an IR-compiled card — unlike the interpreter's own
   * `getCompiledCard`, which only sees IR-compiled records. Bypasses each effect's own
   * `canActivate`/cost gate and runs every effect `effectsForTiming` returns for `timing` — this
   * verb means "resolve its effect", not "activate it" (the caller has already decided to use the
   * card and paid whatever cost that required). Returns false when `cardId` has no registered
   * module or no effect for `timing` (nothing ran); true otherwise.
   */
  resolveCardEffect(ctx: EffectContext, cardId: string, timing: EffectTiming): Promise<boolean>;
  trashFromSecurity(
    seat: Seat,
    n: number,
    opts?: { fromTop?: boolean; instanceIds?: string[] },
  ): Promise<CardInstance[]>;
  /**
   * "By trashing the top security card of 1 player with the most security cards, ...".
   * A player is eligible when they have >=1 security card AND >= the other player's count
   * (a tie leaves BOTH eligible — `controllerSeat` chooses, KB Q6167). The whole thing is
   * OPTIONAL: `controllerSeat` may decline. Returns which seat (if any) was trashed from
   * and the trashed card so the caller can branch on what happened.
   */
  trashTopSecurityOfPlayerWithMostSecurity(controllerSeat: Seat): Promise<{ seat: Seat; trashed: CardInstance[] }>;
  /**
   * Delete permanents from the field; returns the COUNT actually removed (a prevented or
   * deletion-immune permanent contributes 0 — KB BT23-069 Q5338). The interpreter binds this on
   * `ctx.lastDeleteCount` so a subsequent "if this effect didn't delete" Condition can gate.
   */
  deletePermanent(permanentIds: string[], cause?: RemovalCause, opts?: { mechanic?: "Overclock" }): Promise<number>;
  /** Trash an invalid battle-area position during a rule check, without deletion semantics. */
  trashPermanentByRule(permanentIds: string[]): Promise<CardInstance[]>;
  /** Returns the permanent IDs that actually transitioned to suspended. */
  suspend(
    permanentIds: string[],
    opts?: {
      byEffectSeat?: Seat;
      byEffectCardId?: string;
      deferTriggers?: boolean;
      suppressWhenEffectSuspends?: boolean;
    },
  ): Promise<string[]>;
  fireSuspensionTriggers?(
    permanentIds: string[],
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string },
  ): Promise<void>;
  unsuspend(permanentIds: string[]): Promise<void>;
  /**
   * Return cards to their owners' hands. Async because a permanent bounce consults the
   * leave-the-battle-area PREVENT reactions first (a "would leave" reaction voids hand
   * bounce too, not just deletion); a prevented permanent is left in play. When
   * `detachPermanentTop` is set, each id names a permanent's visible top card and only that
   * card returns while its underlying stack card is promoted in place.
   */
  returnToHand(
    instanceIds: string[],
    opts?: { silent?: boolean; byEffectSeat?: Seat; detachPermanentTop?: boolean },
  ): Promise<CardInstance[]>;
  returnToDeck(
    instanceIds: string[],
    opts?: {
      toTop?: boolean;
      byEffectSeat?: Seat;
      byEffectCardId?: string;
      suppressWhenEffectAddsToDeck?: boolean;
    },
  ): Promise<CardInstance[]>;
  /**
   * Return the named top cards of one or more Digimon stacks to their owners' deck tops while
   * preserving each permanent and promoting its highest remaining card. The ids must form a
   * suffix of each complete stack (digivolution cards plus current top), and at least one card
   * is always retained per permanent.
   */
  returnStackTopsToDeck(
    instanceIds: string[],
    opts?: { byEffectSeat?: Seat; byEffectCardId?: string; position?: "top" | "bottom" },
  ): Promise<CardInstance[]>;
  /** Return loose cards to the bottom of their owners' Digi-Egg decks, face-down. */
  returnToEggDeck?(instanceIds: string[]): Promise<CardInstance[]>;
  reveal(seat: Seat, n: number): Promise<CardInstance[]>;
  searchDeck(
    seat: Seat,
    filter: (def: CardDefinition) => boolean,
    opts?: { min?: number; max?: number },
  ): Promise<CardInstance[]>;
  addSecurity(
    seat: Seat,
    instanceIds: string[],
    opts?: { toTop?: boolean; faceUp?: boolean; detachPermanentTop?: boolean },
  ): Promise<void>;
  /** Resolution-source stack used by ownership, source-kind, and deletion-provenance checks. */
  enterEffectResolution?(seat: Seat, sourceKinds?: string[], sourcePermanentId?: string): void;
  leaveEffectResolution?(): void;
  restrictSecurityAddsFromEffect?(blockedEffectSeat: Seat, granterSeat: Seat, duration: EffectDuration): void;
  grantPierce(permanentId: string, duration: EffectDuration, opts?: { continuous?: boolean }): void;
  /**
   * Record a continuous digivolve-cost modification. `filter` is evaluated against the
   * BASE permanent being digivolved plus (when known at cost-query time) the DEFINITION
   * of the card being digivolved INTO (`m.into`). A "when digivolving INTO this card"
   * effect checks `m.into` to scope to its own digivolve; a base-keyed reduction ignores
   * it. `setFixed` makes `delta` an absolute cost (SET, computed before additive deltas).
   * `once` consumes the adjustment only when a matching digivolve is actually applied.
   */
  changeEvoCost(
    filter: (m: EvoCostMatch) => boolean,
    delta: number,
    opts?: {
      setFixed?: boolean;
      once?: boolean;
      continuous?: boolean;
      onConsume?: (match: EvoCostMatch) => void;
      intrinsicCardId?: string;
      intrinsicEffectKey?: object;
    },
  ): void;
  /**
   * Record a continuous play/use-cost modification ("reduce the play cost of your
   * Digimon by N", "increase the cost of your opponent's next Digimon by N"). The
   * play-card / option-use cost calculation consults the recorded adjustments when
   * computing what a card costs. `filter` decides which card definitions (and whose)
   * the adjustment applies to; `setFixed` makes `delta` an absolute cost. Mirrors the
   */
  changePlayCost(
    filter: (facts: { def: CardDefinition; controllerSeat: Seat; permanentId?: string }) => boolean,
    delta: number,
    opts?: { setFixed?: boolean; continuous?: boolean },
  ): void;

  // --- continuous / static (static-continuous-effects subsystem) -------------
  /**
   * Apply a continuous "can't <restriction>" rule to a permanent for a duration.
   * `fromSourceKind`, when provided, qualifies a `beAffected` entry so it blocks
   * only effects sourced from one of those card kinds (see `hasRestriction`).
   */
  /**
   * Record a continuous "can't …" prohibition on a permanent for a duration.
   *
   * `byOpponentEffectsOnly` matches the "…by your opponent's effects" wording most printed
   * protection uses: the prohibition then applies only while the OPPONENT of the restricted
   * permanent controls the resolving effect, leaving the controller's own effects free to
   * target it. Omit it for unscoped wording ("effects can't delete or trash it", EX9-005) and
   * for prohibitions that must also survive rule-based processing (BT18-086's 0 DP Digimon).
   */
  restrict(
    permanentId: string,
    restriction: EnforcedRestriction,
    duration: EffectDuration,
    opts?: { fromSourceKind?: string[]; byOpponentEffectsOnly?: boolean; continuous?: boolean },
  ): void;
  /** Apply a live, duration-scoped restriction to every matching permanent a player controls. */
  restrictPlayer?(
    seat: Seat,
    restriction: EnforcedRestriction,
    duration: EffectDuration,
    matches: (permanentId: string) => boolean,
  ): void;
  /**
   * Prevent one attacker from declaring an attack against one exact opposing Digimon while
   * leaving player attacks and every other Digimon target legal (BT10-042 Venusmon).
   */
  restrictAttackTarget(attackerPermanentId: string, targetPermanentId: string, duration: EffectDuration): void;
  /**
   * Arm a BT23-024 "suspend-restriction-with-superlative-exception" source for `duration`
   * (the [All Turns] link trigger fires this with UntilOpponentTurnEnd). While armed, the
   * continuous-recompute static re-derives the affected opponent set each pass.
   */
  armSuspendRestrictionSource?(permanentId: string, duration: EffectDuration): void;
  /** Whether a BT23-024 suspend-restriction source is currently armed (consuming read). */
  hasSuspendRestrictionSource?(permanentId: string): boolean;
  /**
   * Whether `permanentId` carries a `beAffected` immunity that blocks effects sourced from
   * `sourceKind` (e.g. `"Option"`). Returns false when absent or when the entry's
   * `fromSourceKind` list does not include `sourceKind`. Used by target resolution to exclude
   * immune permanents from an opponent effect's candidate set (CAP-A8, BT19-089).
   */
  isBeAffectedBySourceKind?(permanentId: string, sourceKind: string): boolean;
  /**
   * True when the permanent carries an UNQUALIFIED `beAffected` restriction (immune to ALL
   * sources, e.g. GrantImmunity "not affected by your opponent's effects"). Source-kind-qualified
   * entries are NOT reported here. Used by target resolution to exclude an immune permanent from
   * an opponent effect of any kind (CAP-C-06, BT19-101).
   */
  isUnaffectableByOpponentEffects?(permanentId: string): boolean;
  /**
   * Record a positive "can only digivolve into [X]" constraint on a permanent (EX10-035). The
   * `matchesInto` predicate is satisfied by the allowed evolving card's definition; the
   * digivolve-legality check rejects any other digivolve onto this permanent.
   */
  restrictDigivolveInto?(
    permanentId: string,
    matchesInto: (def: CardDefinition) => boolean,
    duration: EffectDuration,
  ): void;
  /**
   * Record a continuous "can't have less than `floor` DP" clamp on a permanent (EX11-070's
   * inherited rule implementation; KB Q5941). Applied in the DP-calc layer AFTER all +/- changes are
   * summed (NOT a per-change clamp), distinct from `modifyDp`. The highest active floor binds.
   */
  minDpFloor?(permanentId: string, floor: number, duration: EffectDuration): void;
  /**
   * Record a continuous "your opponent's effects can't trash this Digimon's stacked cards" lock
   * on a permanent (EX11-070's rule implementation; KB Q5943). Consulted by the
   * digivolution-card trash sites (trashDigivolutionCards / deDigivolve) against the trashing
   * effect's seat; the controller's OWN effects still trash.
   */
  stackTrashLock?(permanentId: string, duration: EffectDuration): void;
  /**
   * Protect one specific digivolution-card instance from being trashed by effects, including
   * its controller's effects (BT9-109 X Antibody). Rule-driven moves do not consult this lock.
   */
  stackCardTrashLock?(instanceId: string, ownerSeat: Seat, duration: EffectDuration): void;
  securityAttackInvert?(permanentId: string, duration: EffectDuration): void;
  /** Install an owner- or opponent-turn-end delete on one played permanent. */
  delayedDeletePlayed?(playedPermanentId: string, timing?: "endOfOwnerTurn" | "endOfOpponentTurn"): void;
  /**
   * Install a one-shot end-of-turn memory change for `seat` ("Gain 3 memory. At the end of
   * your turn, lose 3 memory" — BT1-021). Anchor-less: the delayed change fires at the
   * OnEndTurn window even if the installing permanent left the field first (KB Q882/Q883).
   */
  delayedGainMemory?(seat: Seat, amount: number): void;
  /** Grant a continuous name/trait alias to a permanent ("also treated as [X]"). */
  grantNameTrait(
    permanentId: string,
    kind: "name" | "trait",
    tokens: string[],
    duration: EffectDuration,
    opts?: { digiXrosOnly?: boolean },
  ): void;
  /** Grant names whose current values are recomputed from live game state. */
  grantDynamicNames?(permanentId: string, names: () => string[], duration: EffectDuration): void;
  /** Replace printed/original info while effect-granted aliases and colors stay additive. */
  setOriginalCardInfo(
    permanentId: string,
    info: { name?: string; colors?: CardColor[] },
    duration: EffectDuration,
  ): void;
  /**
   * Grant a keyword ability to a permanent for a duration ("gains ＜Blocker＞").
   * ＜Piercing＞ has a dedicated `grantPierce`; this records every other keyword.
   */
  grantKeyword(
    permanentId: string,
    keyword: string,
    duration: EffectDuration,
    amount?: number,
    opts?: {
      continuous?: boolean;
      active?: () => boolean;
      specifiers?: string[];
      sourceCardId?: string;
      sourceEffectText?: string;
      /** Controller and physical kinds of the effect that granted this keyword. */
      sourceSeat?: Seat;
      sourceKinds?: string[];
    },
  ): void;
  /** Treat a permanent as another level only while matching DNA requirements. */
  grantDnaLevel(permanentId: string, level: number, opts?: { intoNames?: string[]; continuous?: boolean }): void;
  /** Pure legality check used before offering an effect-driven DNA result. */
  canDnaDigivolve?(
    materialPermanentIds: string[],
    resultInstanceId: string,
    extraMaterialInstanceIds?: string[],
  ): boolean;
  /** Grant a keyword to all current and future Digimon permanents controlled by a player. */
  grantPlayerKeyword(seat: Seat, keyword: string, duration: EffectDuration, amount?: number): void;
  /**
   * Keywords currently GRANTED to a permanent (the consuming read of `grantKeyword`).
   * A filter's keyword-presence clause ("Digimon with ＜Security Attack＞") must see
   * keywords conferred by ＜...+/-＞ grants, not only the printed text (KB BT12-040 Q2172:
   * "Digimon with ＜Security Attack＞" refers to Digimon affected by SA+/SA- effects).
   */
  grantedKeywords?(permanentId: string): { keyword: string; amount?: number }[];
  /**
   * Consume (remove) the first active keyword grant matching `permanentId` + `keyword`.
   * Used to implement arm-and-consume `＜Delay＞` gating: a `GainKeyword(Delay)` arms the
   * source on one turn; when the gated play resolves, `revokeKeyword(id, "Delay")` consumes
   * the grant so subsequent turns cannot re-fire the play without re-arming.
   */
  revokeKeyword?(permanentId: string, keyword: string): void;
  /**
   * Grant a `<Link +N>` link-limit modifier to a permanent.
   * `delta` is signed; `linkMax` sums every active grant on top of the base 1.
   */
  grantLinkMax(permanentId: string, delta: number, duration: EffectDuration, opts?: { continuous?: boolean }): void;
  /**
   * Install a recipient-scoped link-cost-reduction grant on `permanentId` (documented behavior
   * `rule implementation`): while active, a card carrying one of `traits` that would link
   * to this permanent has its link cost reduced by `amount`. `runLink`/`linkCostOf` read it.
   */
  grantLinkCostReduction(
    permanentId: string,
    amount: number,
    traits: string[],
    duration: EffectDuration,
    opts?: {
      sourceInstanceId?: string;
      controllerSeat?: Seat;
      optional?: boolean;
      oncePerTurnKey?: string;
    },
  ): void;
  linkCostReductionUsed?(key: string): boolean;
  markLinkCostReductionUsed?(key: string): void;
  /**
   * Grant a card kind to a permanent for a duration ("this Tamer is also treated as
   * a Digimon"). Recorded on the ContinuousEffectLedger; the permanent's effective
   * kinds union static def.kinds with active grants. Swept/dropped/cleared with the
   * ledger's DurationBoundary lifecycle (HARD-01). `kinds` are CardKind values
   * (e.g., [CardKind.Digimon]).
   */
  grantKind?(permanentId: string, kinds: import("@aegis/shared").CardKind[], duration: EffectDuration): void;
  /**
   * Record a generic custom grant on a permanent for `duration` (the "everything else"
   * catch-all for GrantStatic actions the interpreter parsed but does not have explicit
   * primitives for — e.g. "quotedEffect", "attackImmunity", "dpReductionImmunity").
   * Stored in-memory, keyed by permanentId; `grant`'s keys are opaque to this primitive.
   * NO CONSUMER reads this store back today — recording is honest authored state (not a
   * silent no-op the way an unassigned primitive would be), but each grant kind stays
   * behaviorally inert until a subsystem is built to interpret it. Always assigned by
   * `createPrimitives` (guarded by `primitives.test.ts`'s completeness check); do not rely
   * on `?.()` to make an unimplemented call "safe" — implement or delete instead.
   */
  grantCustom?(permanentId: string, grant: Record<string, unknown>, duration: EffectDuration): void;
  /**
   * Grant a NAMED built-in effect onto a permanent for `duration` (GrantStatic grant:"effects"
   * built-in effect (e.g. "OnDeletionDeleteLowest" — RB1-030's granted "[On Deletion] Delete 1
   * of your opponent's Digimon with the lowest level"). The effect collector compiles the token
   * to a real Effect anchored on the granted permanent, so it fires through the SAME timing
   * window (OnDestroyedAnyone for an [On Deletion]) as a printed effect — the grant is not a
   * parallel/inert path. Duration-scoped: lapses at its boundary or when the host leaves play.
   */
  grantCustomEffect?(
    instanceId: string,
    ownerSeat: Seat,
    token: string,
    duration: EffectDuration,
    opts?: {
      /** Shared by every materialization of one resolved grant; distinct resolutions stack. */
      activationIdentity?: object;
      /** Re-evaluated when the granted effect would trigger. */
      isActive?: () => boolean;
      /** Explicit continuous-pass provenance; avoids ambient async-scope races. */
      continuous?: boolean;
    },
  ): void;
  /** Grant a named effect to every matching current/future permanent controlled by `seat`. */
  grantPlayerCustomEffect?(
    seat: Seat,
    ownerSeat: Seat,
    token: string,
    duration: EffectDuration,
    matches: (permanentId: string) => boolean,
  ): void;
  /** Active named effects granted to a permanent, for live text-presence filters. */
  customEffectGrants?(permanentId: string): readonly { token: string }[];
  /**
   * Record a seat-level "can't ignore digivolution requirements" rule (documented behavior
   * `rule implementation`). Normal and effect-driven digivolve legality
   * consult this rule before applying any whole- or partial-requirement waiver.
   */
  cannotIgnoreDigivolution(seat: Seat, duration: EffectDuration): void;
  /** Whether a live rule currently forbids `seat` from ignoring digivolution requirements. */
  isDigivolutionRequirementIgnoreBlocked?(seat: Seat): boolean;
  /**
   * Grant a continuous additional COLOR to a permanent ("[Your Turn] This Digimon is also
   * treated as blue"). The permanent's effective color set becomes its printed colors UNIONED
   * with every active grant; the color-legality consumers
   * (digivolve EvoCost color check, play-time color requirement) read the effective set. The
   * grant lapses when the source leaves play or its `when` gate stops holding — the
   * static-continuous-effects lifecycle. `color` is a CardColor value (e.g. CardColor.Blue).
   */
  addColorGrant(permanentId: string, color: CardColor, duration: EffectDuration): void;
  /**
   * Record that an instance may be used/played without meeting its color requirement, or —
   * with `alsoColor` — that one extra colour ALSO satisfies the printed requirement
   * ("Black also meets this card's colour requirements").
   */
  waiveColorRequirement(instanceId: string, duration: EffectDuration, opts?: { alsoColor?: CardColor }): void;
  /**
   * Confer all effects of a digivolution-stack card onto its owning permanent
   * (GrantStatic grant:"effects").
   */
  conferStackEffects(
    targetPermanentId: string,
    stackInstanceId: string,
    duration: EffectDuration,
    opts?: { trigger?: string; excludeInherited?: boolean; inheritedOnly?: boolean; granterInstanceId?: string },
  ): void;
  /** Read the currently active stack-effect conferrals (for effects that borrow another card's skills). */
  stackEffectConferrals?(): readonly {
    targetPermanentId: string;
    stackInstanceId: string;
    trigger?: string;
    excludeInherited?: boolean;
    inheritedOnly?: boolean;
    granterInstanceId?: string;
  }[];
  /**
   * Also offer a permanent's `[On Deletion]` effects — its own printed ones AND the inherited
   * ones its digivolution cards provide — at the end of its own attack (BT16-015's "attach
   * [End of Attack] to all of this Digimon's [On Deletion] effects"). The projected copies are
   * the SAME effects collected in a different window, so their own conditions still gate them
   * (KB BT16-015 Q2614), and the projection rides the continuous tier so it lapses with its
   * source clause (Q2615).
   */
  projectOnDeletionAtEndOfAttack?(permanentId: string, duration: EffectDuration): void;

  // --- security-stack manipulation -------------------------------------------
  /** Shuffle a seat's security stack in place (uniform). */
  shuffleSecurity(seat: Seat): void;
  /** Publicly reveal one chosen card without exposing the rest of its private zone. */
  revealCard(seat: Seat, cardId: string, sourceCardId?: string): void;
  /** Move `n` of a seat's security cards (from top or bottom), or explicit security instances, to its owner's hand. */
  securityToHand(seat: Seat, n: number, opts?: { fromTop?: boolean; instanceIds?: string[] }): Promise<CardInstance[]>;
  /**
   * ＜Recovery +N (Deck)＞: move the top `n` cards of a seat's deck onto the TOP of its
   * security stack (face-down). Hard-capped so the stack never exceeds 5 cards: at 5
   * already in security the move is a no-op (KB EX2-018 Q3304). Returns the cards moved
   * (fewer if the deck runs out or the 5-card cap is reached).
   */
  recoverToSecurity(seat: Seat, n: number): Promise<CardInstance[]>;
  /**
   * Flip a seat's top FACE-UP security card face down (the "by flipping your top
   * face-up security card face down" prevention cost). Returns true when a card was
   * flipped, false when there was no face-up security card.
   */
  flipTopSecurity(seat: Seat): boolean;
  /**
   * Flip a seat's top FACE-DOWN security card FACE UP (EX11-064's "flip your opponent's
   * top face-down security card face up"). Scans from the top of the stack and flips the
   * first face-down card; the card stays in security but is now revealed to both players
   * (a shuffle re-hides it). Returns true when a card was flipped, false when there was
   * no face-down security card. `fromTop` (default) scans from index 0.
   */
  flipSecurityFaceUp(seat: Seat, opts?: { fromTop?: boolean }): boolean;

  // --- combat (attack-and-block subsystem) -----------------------------------
  /**
   * Effect-driven attack: make `attackerPermanentId` attack ("this Digimon attacks" /
   * "1 of your Digimon attacks"). Runs the full combat lifecycle through the
   * CombatController, asking the attacker's controller to choose the attack target
   * (the opponent player, or one of the opponent's suspended Digimon) per
   * Comprehensive Rules §11-2-7. `withoutSuspending` declares the attack without
   * tapping the attacker (the "attacks without suspending" form). Resolves when the
   * attack (and any block window / security check / battle) has fully resolved. A
   * no-op when the permanent cannot legally declare, or when one is already
   * mid-resolution and the engine cannot safely nest (the gap is then narrated).
   */
  forceAttack(
    attackerPermanentId: string,
    opts?: {
      withoutSuspending?: boolean;
      ignoreSummoningSickness?: boolean;
      attackPlayer?: boolean;
      attackPlayerOnly?: boolean;
      vortex?: boolean;
      attackMechanic?: string;
      /** Resolve an attack-cost payload after attack declaration and before declaration-triggered effects. */
      afterAttackDeclaration?: () => Promise<void>;
      afterAttackTriggers?: () => Promise<void>;
      drainTimingWindow?: () => Promise<void>;
    },
  ): Promise<void>;
  /** Whether combat is currently resolving an attack. */
  isAttackResolving?(): boolean;
  /**
   * Redirect the CURRENTLY-resolving attack onto a new target chosen by the source's
   * controller ("change the target of the attack to ..."). Consults the open attack
   * in the CombatController; a no-op when no attack is open. Used by the
   * RedirectAttack IR (e.g. a [Counter] that switches who is being attacked).
   *
   * `chooserSeat` is who picks the new target (default: the source's controller); BT4-075
   * passes the DEFENDING/opponent seat. `optional` lets the chooser decline (the attack then
   * proceeds unchanged). Absent opts => the controller chooses and the redirect is mandatory.
   */
  redirectAttack(candidatePermanentIds: string[], opts?: { chooserSeat?: Seat; optional?: boolean }): Promise<void>;

  /**
   * Grant a permanent the ability to ALSO attack the opponent's unsuspended Digimon
   * (rule implementation, e.g. ST12-08). Recorded on the continuous
   * ledger and read by combat/legality.canAttackTarget; lapses at its duration boundary.
   */
  grantCanAttackUnsuspended(
    permanentId: string,
    duration: EffectDuration,
    opts?: { noDigivolutionCards?: boolean; defenderLevelMax?: number },
  ): void;

  grantVortexCanAttackPlayers?(permanentId: string, duration: EffectDuration): void;

  /**
   * End the in-flight attack (BT23-069 "end that attack"): skip the block window and
   * battle, transition to end-of-attack. A no-op when no attack is open. Changes the
   * timing, not the attacking Digimon.
   */
  endAttack(): void;

  // --- sub-trigger / delayed / replacement (delayed-and-rule-effects) --------
  /** Install a delayed/triggered sub-effect on the event bus. Returns its id. */
  subscribeSubTrigger(sub: SubTriggerInstall): number;
  /** Install a replacement effect. Returns its id. */
  subscribeReplacement(sub: ReplacementInstall): number;

  /**
   * Expand DigiXros material source zones for `seat` for `duration` (BT19-079/BT19-087).
   * The play-card / DigiXros material-picking path reads these via `digiXrosExpandedZones`.
   * Optional on the port so faked primitives in tests need no change.
   */
  expandDigiXrosZones?(seat: Seat, zones: ZoneRef[], duration: EffectDuration): void;
  /** Record a DigiXros expansion for the single pending play that activated it. */
  expandDigiXrosZonesForPlay?(
    seat: Seat,
    zones: ZoneRef[],
    duration: EffectDuration,
    pendingPlayInstanceId?: string,
  ): void;
  /**
   * Read the currently-expanded DigiXros material source zones for `seat`.
   * Returns the union of all active expansions, or an empty array when none. Legacy callers
   * that only need presence may use this; quota-aware callers should use the counted reader.
   * Optional on the port so faked primitives in tests need no change.
   */
  digiXrosExpandedZones?(seat: Seat, pendingPlayInstanceId?: string): ZoneRef[];
  /** Read the active expansion quota by source zone, preserving separate Tamer activations. */
  digiXrosExpandedZoneCounts?(seat: Seat, pendingPlayInstanceId?: string): Partial<Record<ZoneRef, number>>;
  /** Number of pending-play expansion activations for `seat`, for replacement success accounting. */
  digiXrosPlayExpansionCount?(seat: Seat, pendingPlayInstanceId?: string): number;
  /** Consume pending-play expansions after material selection; persistent grants survive. */
  consumeDigiXrosPlayExpansions?(seat: Seat, pendingPlayInstanceId?: string): void;
  /** Resolve matching wouldBePlayed replacements before effect-driven DigiXros material selection. */
  prepareDigiXrosPlay?(instanceId: string): Promise<string[]>;

  /** Spawn a token Digimon as a new battle-area permanent. */
  playToken(
    seat: Seat,
    tokenName: string,
    opts?: {
      payCost?: boolean;
      suspended?: boolean;
      keywords?: Array<{ keyword: string; amount?: number; specifiers?: string[] }>;
    },
  ): Promise<Permanent | undefined>;
  /** Apply a transient DP modifier to a seat's security Digimon during a check. */
  modifySecurityDp(seat: Seat, delta: number, opts?: { continuous?: boolean; duration?: EffectDuration }): void;
  /**
   * Resolve a DIRECT battle between two battle-area Digimon (a §14 DP comparison; the loser,
   * or both on a tie, is deleted). No attack declaration / block / security — distinct from
   * forceAttack. Per KB the battle is a rule, so it does not check effect-immunity. Optional
   * on the port so faked primitives in tests need no change.
   */
  forceBattle?(attackerPermanentId: string, defenderPermanentId: string): Promise<void>;
  /**
   * Record a continuous DP-based-deletion maximum bonus (the producer side of the
   * DP-deletion-maximum subsystem). Owner-wide when given a seat, source-scoped when given a
   * permanentId. Optional on the port so faked primitives in tests need no change.
   */
  addDeletionMaxDp?(target: { seat: Seat } | { permanentId: string }, delta: number): void;
  /** The active DP-cap bonus for a deletion resolved by `seat` from `sourcePermanentId`. */
  deletionMaxDpBonus?(seat: Seat, sourcePermanentId?: string): number;
  /**
   * Accumulate a DP-delete-budget bonus for a source permanent (producer side of the
   * `AddToDPDeleteBudget` inherited-modifier subsystem). Called once per inherited instance
   * that fires; stacks. Optional on the port — tests that do not exercise the bonus need no change.
   */
  addDpDeleteBudget?(permanentId: string, amount: number): void;
  /**
   * Return the total accumulated DP-delete-budget bonus for the given source permanent.
   * Returns 0 when no bonus has been recorded (no `AddToDPDeleteBudget` fired). Optional.
   */
  dpDeleteBudgetBonus?(permanentId: string): number;
  /**
   * Place a loose Option card into its owner's battle area as a battle-area PERMANENT
   * (source `CanPlayAsNewPermanent isPlayOption:true` / `PlaceDelayOptionCards`). Used by
   * Option-permanent effects such as EX3-036 placing [Trial of the Four Great Dragons] from
   * hand: the Option stays in play rather than resolving-then-trashing. Distinct from
   * `playInstances` (which only plays Digimon/Tamer/DigiEgg permanents and silently skips
   * Options). The placement is gated to a card whose kind is Option; a non-Option instance is
   * a no-op. Returns the created Permanent, or undefined when the instance is missing / not an
   * Option. Optional on the port so faked primitives in tests need no change.
   */
  placeOptionAsPermanent?(instanceId: string): Promise<Permanent | undefined>;
  /**
   * Pay an activation cost by suspending a permanent (BeforePayCost / activateClass1
   * pattern, HARD-05). The caller has already resolved which permanent to pay with;
   * this primitive validates the permanent is unsuspended, affectable, and on the
   * battle area, then suspends it. Returns true when the payment succeeded (permanent
   * was suspended), false when invalid/immune/already-suspended/no-longer-on-field.
   *
   * Explicit parameters — NEVER reads ctx.source.permanent(), which is undefined
   * during the BeforePayCost timing window. Optional on the port so faked primitives
   * in tests need no change.
   */
  payActivationCost?(permanentId: string, costKind: "suspend"): boolean;
  /** Check an activation cost without mutating the permanent. */
  canPayActivationCost?(permanentId: string, costKind: "suspend"): boolean;
  /**
   * Re-activate one (or, with `chooseOne: false`, ALL) of a target permanent's own effects at
   * the given timing(s) — the "activate 1 of that Digimon's [X] effects" family (EX3-065 "[On
   * Play] effects"; generalized for BT11-112 "[When Digivolving] effects", BT24-102 "[On Play]
   * or [When Digivolving] effect" — a combined pool across BOTH timings, BT22-092 "[Main]
   * effects" (`EffectTiming.OnDeclaration`), and BT15-041 "activate the [When Digivolving]
   * effects" — plural, every matching effect, not a choice).
   *
   * `timings` defaults to `[OnPlay]` (EX3-065's original single-timing shape). Collects the
   * TARGET permanent's top-card effects and active inherited effects across every listed timing; when
   * `chooseOne` (default true) there are 2+ candidates, asks the target's controller to pick
   * exactly one (KB Q3430/Q3431 for the OnPlay case); with `chooseOne: false`, every matching
   * candidate resolves in collection order. Each chosen effect resolves with the TARGET
   * permanent as source — a genuine re-fire of that card's own timing effect, not a proxy.
   * Returns whether an effect actually activated (false when there were no eligible
   * candidates, or the chosen one's `canActivate` failed) — BT22-092's "if this activated
   * any effect, gain 1 memory" reads this. Optional on the port; no-op in fakes.
   */
  reactivateOnPlay?(
    permanentId: string,
    opts?: { timings?: EffectTiming[]; chooseOne?: boolean; outsideTriggerWindow?: boolean },
  ): Promise<boolean>;
}

/** Args for installing a delayed/triggered sub-effect via the primitives. */
export interface SubTriggerInstall {
  event: SubTriggerEventName;
  /** Stable action identity used to avoid duplicate installs while preserving distinct clauses. */
  dedupeKey?: string;
  /** Printed placement class retained so a pending watcher passes the same kernel guard. */
  isInheritedSource?: boolean;
  isLinkedSource?: boolean;
  sourcePermanentId?: string;
  /**
   * Anchor for a watcher installed by a card that is NOT a live battle-area Permanent —
   * a hand- or trash-resident source ("when this card is trashed from the hand", a
   * `[Trash]` continuous reaction). When paired with `sourcePermanentId`, it preserves
   * the exact printed source card while the permanent id anchors lifecycle. Otherwise,
   * the engine resolves it against the loose CardInstance wherever it currently sits
   * (hand/trash/security), binding `ctx.source` from it instead of requiring a Permanent.
   * See `SubTriggerRegistry.subscribe`'s loud-failure guard: a
   * watcher with a `matches` predicate and NEITHER anchor can never fire and is now a
   * hard error at install time, not a silent no-op.
   */
  sourceInstanceId?: string;
  /** Retained live context for a seat-scoped timed watcher with no permanent/card anchor. */
  activationContext?: EffectContext;
  once: boolean;
  /** Marks a watcher installed by a persistent static effect for recompute teardown. */
  continuous?: boolean;
  run: (ctx: EffectContext) => Promise<void>;
  /**
   * Per-install gate on the fired event's payload (the captured `sourceFilter`).
   * Absent => the sub fires for every event of its type. See SubTriggerSubscription.matches.
   */
  matches?: (ctx: EffectContext) => boolean;
  /**
   * Can this watcher still DO anything? Consulted only when several watchers fire off the
   * same event and their controller is asked to order them: a watcher that answers false
   * would resolve to nothing (its `by suspending this Tamer` cost is unpayable because the
   * Tamer is already suspended), so it must not appear in that ordering prompt. Firing
   * itself is unaffected — the body's own guard still decides what happens.
   * Absent => the watcher always competes for ordering.
   */
  canFire?: (ctx: EffectContext) => boolean;
  /**
   * A GRANTED watcher's expiry: the seat whose turn-END drops this subscription
   *. Absent => the watcher lives until its
   * anchor leaves the field. Swept by the engine at each turn-end boundary.
   */
  expiresOnTurnEndOf?: Seat;
  /**
   * Fires at most once per `fire()` call even if the event fires multiple times in that
   * batch (KB Q2814 for BT2-053; see SubTriggerSubscription.oncePerTiming).
   */
  oncePerTiming?: boolean;
  /**
   * A stable per-TURN key gating this watcher to fire at most once per turn — set this
   * for a persistent (`[All Turns]` / `EffectTiming.None`) effect's `[Once Per Turn]`
   * watcher (its enclosing `staticModifier`'s `maxPerTurn` is NOT counted by the engine;
   * see SubTriggerSubscription.oncePerTurnKey). Must be stable across the continuous
   * recompute that reinstalls this subscription — use `${cardId}/effect-name`, not the
   * subscription id.
   */
  oncePerTurnKey?: string;
  description: string;
}

/** Fields common to every mode of a replacement install. */
export interface ReplacementInstallBase {
  event: ReplacementEventName;
  sourcePermanentId?: string;
  /** Anchor for a replacement sourced from a loose card in hand/trash. */
  sourceInstanceId?: string;
  /** Stable compiled effect/action identity; never derived from display prose. */
  activationIdentity?: string;
  /** Stable per-turn budget key for a persistent `[Once Per Turn]` replacement. */
  oncePerTurnKey?: string;
  /**
   * Gate on the removal cause. The consult passes the actual cause, the seat whose effect
   * drove the removal, and whether the removal is a bounce/move (vs a deletion); return false
   * to skip firing for this cause. The `isBounce` flag lets an "except deletion" prevention
   * (EX6-044) allow a deletion through while still voiding a move.
   */
  causeAllows?: (cause: RemovalCause, resolvingSeat: Seat | undefined, isBounce: boolean) => boolean;
  expiresOnTurnEndOf?: Seat;
  description: string;
}

/** "reduceCost": returns a cost delta at the matching cost-computation seam; no prevention gate. */
export interface ReplacementInstallReduceCost extends ReplacementInstallBase {
  mode: "reduceCost";
  amount?: number;
  amountForInto?: (def: CardDefinition) => number;
  /**
   * For mode "reduceCost" + event "wouldDigivolve": restrict the reduction to when the
   * digivolution target (the "into" card) matches this definition predicate. Absent => applies
   * to all digivolutions from the source permanent. Mirrors `ReplacementAction.into`.
   */
  intoMatches?: (def: CardDefinition) => boolean;
  /** Optional target predicate when the source permanent anchors a controller-wide reducer. */
  appliesTo?: (target: Permanent) => boolean;
  /**
   * For ＜Digisorption＞ redirect (BT3-056): when true, the reduction's suspend cost is paid by
   * the OPPONENT (opponent's Digimon are suspended), not the controller's. Set from
   * `ReplacementAction.digisorptionRedirect`. Absent => standard behavior.
   */
  digisorptionRedirect?: boolean;
  controllerSeat?: Seat;
  /** Live context retained by one-shot reducers whose source is no longer a permanent. */
  activationContext?: EffectContext;
  activate?: (
    ctx: EffectContext,
    target: Permanent,
    into: CardDefinition,
    evolvingInstanceId?: string,
    materials?: readonly Permanent[],
  ) => Promise<boolean | number>;
  consumeOnActivate?: boolean;
}

/** Gain memory after the anchored material successfully participates in a DNA digivolution. */
export interface ReplacementInstallDnaMemory extends ReplacementInstallBase {
  mode: "gainMemoryOnDna";
  amount: number;
  intoMatches?: (def: CardDefinition) => boolean;
}

/**
 * "instead": consulted by `leavePrevention.ts` alongside "prevent" when a permanent would
 * leave/be deleted. Unlike "prevent", an "instead" reaction does NOT stop the removal — it
 * substitutes/attaches a side effect ("you may play 1 [X] from your hand") for the event
 * without gating whether the removal itself happens (Comprehensive Rules §16-36 ＜Decode＞:
 * "would leave the battle area ... you may play 1 specified Digimon card ... without paying
 * the cost" — the leave still occurs). `apply` is REQUIRED — an "instead" entry with no
 * `apply` used to typecheck and then be silently dropped by the consult (which only ran
 * "prevent" entries), so the reaction never ran. Making the field mandatory here turns that
 * class of bug into a compile error instead of a runtime no-op (mirrors `ReplacementInstallPrevent`).
 */
export interface ReplacementInstallInstead extends ReplacementInstallBase {
  mode: "instead";
  apply: (ctx: EffectContext) => Promise<void | boolean>;
  /**
   * For ＜Digisorption＞ redirect (BT3-056): when true, the Replacement's suspend cost
   * is paid by the OPPONENT (opponent's Digimon are suspended), not the controller's.
   * Set from `ReplacementAction.digisorptionRedirect`. Absent => standard behavior.
   */
  digisorptionRedirect?: boolean;
  /** Does this apply to `leavingPermanentId`? (self-reaction => only its own source; a filtered
   * reaction => any matching permanent, e.g. BT20-091 "any of your Digimon with [Royal Knight]".) */
  appliesTo?: (ctx: EffectContext, leavingPermanentId: string) => boolean;
  /** Predicate for a pending `wouldBePlayed` target, which has no live permanent id yet. */
  appliesToPending?: (ctx: EffectContext, target: Permanent) => boolean;
  /** Stable per-turn key gating this reaction to once per turn (BT20-091 "[Once Per Turn]"). */
  oncePerTurnKey?: string;
}

/**
 * "prevent": the engine's leave-prevention consult (`leavePrevention.ts`) runs `preventCheck`
 * when a permanent would leave/be deleted. `preventCheck` is REQUIRED by this type — a
 * `mode: "prevent"` entry with no `preventCheck` used to typecheck and then be silently
 * filtered out by the consult (`r.preventCheck !== undefined`), so the reaction never ran.
 * Making the field mandatory here turns that class of bug into a compile error instead of a
 * runtime no-op.
 */
export interface ReplacementInstallPrevent extends ReplacementInstallBase {
  mode: "prevent";
  /** Does this guard `leavingPermanentId`? (self-reaction => only its own source.) */
  protects?: (ctx: EffectContext, leavingPermanentId: string) => boolean;
  /** Prompt + pay the cost; true => the removal is prevented. */
  preventCheck: (ctx: EffectContext, leavingPermanentId: string) => Promise<boolean>;
  /** One activation prevents ALL matching permanents. */
  affectsAll?: boolean;
  /** Stable per-turn key gating this prevention to once per turn (＜Barrier＞). */
  oncePerTurnKey?: string;
}

/**
 * "redirect": consulted BEFORE a digivolution-card trash chooses which cards to take (KB
 * BT10-084 Q2002-Q2008), not after — swapping only the HOST permanent so the caller's own
 * top/bottom/choose/amount selection logic re-runs unmodified against the new host's stack.
 * That is what keeps the redirect faithful to the original action's count and selection kind
 * (Q2003's "trash all" still trashes ALL of the new host's cards; Q2004's "trash as many as
 * possible" falls out of the caller re-clamping its count to the new host's stack length,
 * with no special-casing needed here). `redirectTo` is REQUIRED — a "redirect" entry with no
 * `redirectTo` used to typecheck and then be silently dropped by the consult, so the reaction
 * would never fire. Making the field mandatory turns that class of bug into a compile error
 * instead of a runtime no-op (mirrors `ReplacementInstallPrevent`/`ReplacementInstallInstead`).
 */
export interface ReplacementInstallRedirect extends ReplacementInstallBase {
  mode: "redirect";
  /**
   * Is every one of `originalHostPermanentIds` eligible for this reaction (their controller,
   * the timing gate, "not this card's own stack")? The consult only offers the redirect when
   * ALL hosts in one trash operation qualify — a mixed-ownership target set (which no known
   * card produces) is left unredirected rather than guessed at. Absent => never applies
   * (defensive; real installs always set this).
   */
  appliesTo?: (ctx: EffectContext, originalHostPermanentId: string) => boolean;
  /**
   * Prompt the controller ("you may trash this Digimon's digivolution cards instead"); returns
   * the alternate host permanentId to redirect the WHOLE trash operation to, or undefined when
   * declined.
   */
  redirectTo: (ctx: EffectContext, originalHostPermanentIds: string[]) => Promise<string | undefined>;
}

/** Args for installing a replacement effect via the primitives. */
export type ReplacementInstall =
  | ReplacementInstallReduceCost
  | ReplacementInstallDnaMemory
  | ReplacementInstallInstead
  | ReplacementInstallPrevent
  | ReplacementInstallRedirect;

/**
 * Player-decision API (card-module contract). Each call raises a
 * DecisionRequest to the controlling seat and resolves when the matching
 * respondDecision intent arrives.
 *
 * Implemented by `createDecisionApi` in `engine/decisions/decisionApi.ts`, wired
 * into GameEngine.
 */
export interface DecisionApi extends SeatScopedDecisionApi {
  /**
   * The same decision surface, addressed to the effect's NON-controlling seat instead of
   * `ctx.source.ownerSeat` — for printed text that explicitly assigns a choice to "your
   * opponent" (e.g. "your opponent trashes 1 card in their hand"). Optional so pre-existing
   * test fixtures that build a `DecisionApi` by hand do not all need updating; card code
   * must go through `requireOpponentAsk(ctx)` (decisionApi.ts) rather than reading this
   * directly, so a fixture missing it fails loudly instead of silently no-opping. See
   * `createDecisionApi` (decisionApi.ts) for the routing/security rationale.
   */
  opponent?: SeatScopedDecisionApi;
}

/** One seat-addressed decision surface — see `DecisionApi.opponent`'s doc comment. */
export interface SeatScopedDecisionApi {
  optional(ctx: EffectContext, prompt: string): Promise<boolean>;
  chooseTargets(
    ctx: EffectContext,
    opts: {
      candidates: string[];
      min: number;
      max: number;
      visible?: string[];
      maxTotalPlayCost?: number;
      maxTotalDP?: number;
    },
  ): Promise<string[]>;
  selectCards(
    ctx: EffectContext,
    opts: {
      candidates: string[];
      min: number;
      max: number;
      visible?: string[];
      visibleCards?: { instanceId: string; cardId: string }[];
      maxTotalPlayCost?: number;
      differentColors?: boolean;
      distinctCardIds?: boolean;
    },
  ): Promise<string[]>;
  /** Arrange every offered card in deck order; the first id is nearest the deck top. */
  orderCards?(
    ctx: EffectContext,
    opts: {
      candidates: string[];
      visibleCards?: { instanceId: string; cardId: string }[];
      destination?: "deckTop" | "deckBottom" | "stackBottom";
    },
  ): Promise<string[]>;
  selectPermanents(
    ctx: EffectContext,
    opts: { candidates: string[]; min: number; max: number; maxTotalPlayCost?: number },
  ): Promise<string[]>;
  chooseOption(ctx: EffectContext, choices: string[]): Promise<number>;
}

/**
 * What canTrigger / canActivate / resolve receive at runtime
 * (card-module contract).
 */
export interface EffectContext {
  source: CardSource;
  /** Placement proof for an inherited source discarded from its live host during this event. */
  discardedStackSourceProof?: DiscardedStackSourceProof;
  /**
   * Rules identity of the effect currently resolving when it differs from the physical
   * card's combined kinds. For example, a DUAL Digimon directly activating its Option-side
   * [Main] produces an Option effect (BT25-104 Q6496-Q6498).
   */
  effectSourceKinds?: readonly string[];
  trigger: TriggerInfo;
  /**
   * Printed timing of the effect currently resolving (the IR `CardEffect.trigger`, e.g. "OnPlay").
   * Set by `runEffect`; surfaced on each DecisionRequest so the client overlay can show only the
   * relevant printed clause instead of the card's full effect text. Display-only.
   */
  activeTiming?: string;
  /** Internal marker for effects re-derived by the continuous-effect pass. */
  continuousPass?: boolean;
  /** Exact rules clause currently resolving, including inherited/security provenance. Display-only. */
  activeEffectText?: string;
  /**
   * Context-specific rules applied while a borrowed CardEffect resolves. This is seeded only by
   * an ActivateForeignEffect action and never mutates the lender's compiled IR.
   */
  borrowedEffectOverrides?: ActivateForeignEffectOverrides;
  /** Stable compiled effect identity used by installed reactive actions; never derived from prose. */
  activeEffectKey?: string;
  /** Stable zero-based action path within the active compiled effect. */
  activeActionPath?: string;
  /**
   * What the IR action currently running will do to the permanents it asks the controller
   * to pick (`targetFateOf`, set and restored by `runAction`). Surfaced on each
   * `chooseTargets` request so the client can badge a picked target with its coming fate.
   * Display-only.
   */
  activeTargetFate?: TargetFate;
  /** Temporary restrictions installed by a RestrictEffect action in this resolution. */
  effectRestrictions?: Set<string>;
  game: GameAccess;
  fx: Primitives;
  ask: DecisionApi;
  /** Shared per-turn use ledger, exposed for passive effects whose use is consumed at payment. */
  usage?: {
    count(instanceId: string, effectKey: string): number;
    register(instanceId: string, effectKey: string): void;
  };
  /** Re-entrantly resolves the remaining effects from the current timing window. */
  drainCurrentTimingWindow?: () => Promise<void>;
  /**
   * Per-effect-resolution store for `SelectBind` targets: handle (e.g. "A") -> the chosen
   * permanentId. Populated when a `SelectBind` action resolves and read by a later action's
   * `Filter.relativeTo.selectionRef` / `Target.fromSelectionRef` / `PlaceUnder.underSelectionRef`
   * ("select A, then act on B with DP <= A's"). Fresh per `runEffect`; absent means no binding.
   */
  selections?: Map<string, string>;
  /**
   * Loose card instances already committed to the action currently being declared. Cost
   * selection must not reuse one of them (for example, an under-Tamer card chosen as the
   * imminent digivolution card cannot also pay a would-digivolve placement cost).
   */
  reservedCostInstanceIds?: ReadonlySet<string>;
  /**
   * Attribute snapshot of each `SelectBind` target, taken at the moment it was bound. A clause
   * that deletes the chosen Digimon and then compares against it ("delete it and 1 of your
   * opponent's Digimon with as much or less DP as it" — BT16-070) still needs those attributes
   * after the permanent has left the board, where `selections` alone resolves to nothing.
   */
  selectionFacts?: Map<
    string,
    { dp?: number; level?: number; playCost?: number; digivolutionCount?: number; name?: string }
  >;
  /**
   * When set, this effect is conferred from a digivolution-stack card onto
   * `conferredToPermanentId` (GrantStatic grant:"effects").
   */
  conferredToPermanentId?: string;
  /** Physical source of the GrantStatic copy, used to preserve independent Q1943 frequency. */
  conferralGranterInstanceId?: string;
  /**
   * Effect-RESULT bindings, scoped to the CURRENT effect resolution (fresh per `runEffect`,
   * like `selections`). A producing action writes its outcome here so a SUBSEQUENT gating
   * Condition ("if this effect didn't delete / used / digivolved") can read it. Generalizes
   * the established `endAttack()`-returns-bool precedent. Built once (08-01), reused by 08-03
   * (delete-outcome), 08-06 (option-use), 08-08 (digivolve-result).
   *
   * `lastDeleteCount`: permanents ACTUALLY removed by the most recent Delete in this resolution
   *   (an immune/prevented target contributes 0 — KB BT23-069 Q5338). Undefined => no Delete ran.
   * `lastDigivolveResult`: whether the most recent digivolve in this resolution happened.
   * `lastOptionUsed`: whether an Option-use happened (set by the 08-06 use verb; declared here).
   * `lastEffectActed`: whether the most recent place/trash branch action actually moved >=1 card —
   *   the "if you did (either)" gate for an OR-modal whose tail is conditional on the branch acting
   *   (BT16-094: place-from-hand OR trash, then -7000 DP only if you did either). Set by
   *   PlayWithoutCost / Trash; an optional selection declined to nothing leaves it false.
   * `lastPlayedPermanentIds`: permanents created by the most recent play action in this resolution.
   *   A following DelayedDelete action uses it for "At the next end of your opponent's turn,
   *   delete it" on a Digimon just played by this effect.
   */
  lastDeleteCount?: number;
  /** Whether the most recent Delete selected a target, even if deletion was prevented. */
  lastDeleteTargetSelected?: boolean;
  /**
   * The MAX printed level among permanents deleted by the most recent Delete (or `deleteOwn`
   * subsequent target filter's `levelComparison.relativeTo:"lastDeleted"` binds its threshold
   * to this (BT8-107: delete an opponent's Digimon with level ≤ the cost-deleted Digimon's).
   * Undefined => no Digimon with a level was deleted in this resolution.
   */
  lastDeletedLevel?: number;
  /** Live DP captured before the most recent deletion, for DP-bounded follow-up targets. */
  lastDeletedDP?: number;
  lastDigivolveResult?: boolean;
  lastOptionUsed?: boolean;
  lastOptionUsedInstanceId?: string;
  lastEffectActed?: boolean;
  /** Whether the opponent declined the immediately preceding opponent-choice action. */
  lastOpponentDeclined?: boolean;
  /** A printed optional activation was declined, so its provisional OPT mark must be restored. */
  oncePerTurnActivationDeclined?: boolean;
  /** Whether the most recently dispatched action's condition matched. */
  lastActionConditionMatched?: boolean;
  lastPlayedPermanentIds?: string[];
  /**
   * Permanents suspended by the most recent suspend cost/action in this effect resolution.
   * Used by clauses like "with as much or less DP as the Digimon this effect suspended".
   */
  lastSuspendedPermanentIds?: string[];
  lastTrashedCards?: { instanceId: string; cardId: string; dp: number }[];
  /**
   * Cards revealed by the most recent Reveal/RevealAdd action in this effect resolution.
   * Kept as a snapshot because the cards may be immediately returned to deck bottom/hand/trash,
   * while a following action still needs to count "among the revealed cards".
   */
  lastRevealedCards?: { instanceId: string; cardId: string; ownerSeat: Seat }[];
  /**
   * Set by the universal ＜Delay＞ activation wrapper after it has validated and consumed an
   * armed Delay keyword grant before trashing the source permanent. Inner actions marked
   * `requiresDelayArmed` must accept this flag because the source permanent may already be gone.
   */
  delayArmedConsumed?: boolean;
  /**
   * Accumulated pay-time play-cost REDUCTION computed by a `ReducePlayCost` action resolving in a
   * `BeforePayCost` window (EX9-043 / BT25-076). The play action fires that window for the in-hand
   * card BEFORE paying, then reads this delta to floor the cost (`max(0, cost - playCostDelta)`).
   * SERVER-AUTHORITATIVE: the optional payment runs inside the engine; the client never supplies
   * the delta (T-08-26). Undefined / 0 => no reduction (payment declined or none eligible).
   */
  playCostDelta?: number;
  /** Temporary maximum-level adjustment for a subsequent effect-driven hand play. */
  playLevelCeilingDelta?: number;
  /**
   * Battle-area permanent ids a `wouldBePlayed` self-reducer's cost body (BT12-112) selected to be
   * relocated as a digivolution card under the card being played — collected during
   * `fireBeforePayCost`, BEFORE that card's own permanent exists (`ctx.fx.relocatePermanent` needs a
   * real destination id, so the relocation itself can't run yet). The engine reads this list once the
   * played permanent is created and performs the deferred `relocatePermanent` calls then (mirrors the
   * BT10-093 cross-permanent reducer's `pendingPlayReducerPlacements` queue). Undefined / empty =>
   * no self-reducer requested a relocation this play. `shedOwnCards` relocates only the source
   * permanent's top card and trashes the rest of its stack (BT15-102 places battle-area top cards
   * per KB Q2599); without it the whole permanent moves under the played card (BT12-112).
   */
  pendingSelfReducerRelocations?: { permanentId: string; shedOwnCards?: boolean }[];
  /** Loose card instance ids committed under the card being played once its permanent exists. */
  pendingSelfReducerPlacements?: string[];
  /**
   * The set of permanent ids ACTUALLY deleted by the most recent `DeleteByDPBudget` action in
   * this resolution (CAP-A3). Written by the executor after the batch delete; read by the
   * `scaleFactor` resolver when `scaling.filter.deletedByThisEffect` is true. Undefined if no
   * `DeleteByDPBudget` has run in this resolution yet.
   */
  lastDeletedByThisEffectIds?: string[];
  /** All permanents actually deleted across every Delete action in this effect resolution. */
  deletedThisEffectIds?: string[];
  /** Seat-relative memory gained by the immediately preceding GainMemory action. */
  lastMemoryGainAmount?: number;
  /** Loose card instances moved by the immediately preceding PlaceUnder action. */
  lastPlacedUnderInstanceIds?: string[];
  /**
   * Loose card instances moved by all PlaceUnder actions in this effect resolution. Reset at the
   * action-bearing runEffect boundary; nested resolutions restore their caller's accumulator.
   */
  placedUnderInstanceIdsThisEffect?: string[];
  /**
   * The permanent ids resolved by the most recent primary-target action in this effect
   * resolution. Written after each `resolvePermanentTargets` call for a non-sameTarget target;
   * read by a subsequent action whose `target.sameTarget` is true (CAP-A9, BT19-089). Undefined
   * before the first action resolves its targets.
   */
  lastResolvedPermanentIds?: string[];
  /**
   * Named sets of permanent ids produced by actions that use `bindResultAs` (e.g. PlayPerLevel).
   * A downstream action's `filter.boundRef` restricts candidates to the named set. Fresh per
   * `runEffect`; absent means no binding has been written yet.
   */
  boundPlayed?: Map<string, Set<string>>;
  /**
   * Named integer counters written by actions that carry `trackCount` (e.g. Suspend
   * with `trackCount:"suspendedThisEffect"`). A subsequent `RepeatPerCount` action reads
   * the count to loop its nested `action` that many times (BT2-041). Fresh per `runEffect`.
   */
  namedCounts?: Map<string, number>;
  /** Colors snapshotted from cards paid by the current return cost. */
  lastReturnedColors?: string[];
}
