import {
  CardKind,
  EffectDuration,
  type CardColor,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
  type ZoneRef,
} from "@aegis/shared";
import type { Restriction } from "./EffectContext.js";
import type { DurationBoundary } from "./modifiers.js";
import { findPermanentInState } from "../state/access.js";

/**
 * Continuous-effect application layer (subsystem: static-continuous-effects).
 *
 * Some card text does not perform a one-shot mutation but imposes an ongoing
 * RULE while the source is in play (or for a bounded duration): a Digimon that
 * "can't attack", an "attack target can't change", a name/trait alias ("also
 * treated as [X]"), or a permission ("use this card without meeting its color
 * requirements"). source these are queried at decision points (can-attack,
 * can-change-target, name comparison, color-cost check) rather than stored as a
 * stat. This ledger is the server-only store the engine's combat / turn / cost
 * code reads at those points.
 *
 * Scope (consistent with the `core` effect-primitives sibling, modifiers.ts): it
 * OWNS the continuous-rule store and the boundary sweep. It does NOT itself drive
 * combat/turn legality — the consumers (combat legality, attack target change,
 * card-name comparison, color-cost check) read it. Recording a rule is therefore a
 * REAL effect (authoritative server state survives until its boundary), not a
 * silent no-op; the read sites are documented TODOs where not yet wired.
 *
 * Pairs with ModifierLedger: that one owns numeric DP/pierce/evo-cost windows; this
 * one owns boolean restrictions, name/trait aliases, and color-cost waivers. They
 * share the same DurationBoundary sweep contract so the engine clears both at once.
 */

/**
 * Marks an entry as produced by a PERSISTENT (static / `EffectTiming.None`) effect
 * rather than a one-shot triggered one. The continuous-recompute pass
 * (GameEngine.recomputeContinuousEffects) clears `continuous` entries and re-derives
 * them by re-firing the static effects; a one-shot entry ("gains ＜Blocker＞ until end
 * of turn") is kept and expires only at its own duration boundary. See
 * ModifierLedger.DpModifier.continuous for the numeric sibling.
 */
interface RestrictionEntry {
  permanentId: string;
  restriction: Restriction;
  duration: EffectDuration;
  continuous?: boolean;
  /**
   * When set, this `beAffected` entry blocks ONLY effects whose source card is
   * one of these kinds. An entry without `fromSourceKind` blocks regardless of
   * source (existing behavior).
   */
  fromSourceKind?: string[];
  /**
   * When set, this entry blocks ONLY effects controlled by the restricted permanent's
   * opponent — the "…by your opponent's effects" wording most printed protection uses
   * (BT14-062, BT11-060, BT18-064, …). An entry without it blocks regardless of who
   * controls the effect ("effects can't delete or trash it", EX9-005).
   */
  byOpponentEffectsOnly?: boolean;
}

interface PlayerRestrictionEntry {
  seat: Seat;
  ownerSeat: Seat;
  restriction: Restriction;
  duration: EffectDuration;
  matches: (permanentId: string) => boolean;
  continuous?: boolean;
}

interface AttackTargetRestriction {
  attackerPermanentId: string;
  targetPermanentId: string;
  duration: EffectDuration;
  continuous?: boolean;
}

interface NameTraitGrant {
  permanentId: string;
  kind: "name" | "trait";
  tokens: string[];
  duration: EffectDuration;
  continuous?: boolean;
  /** When true, this name alias is ONLY valid for DigiXros material matching. */
  digiXrosOnly?: boolean;
  dynamicTokens?: () => string[];
}

interface OriginalCardInfoOverride {
  permanentId: string;
  name?: string;
  colors?: string[];
  duration: EffectDuration;
  continuous?: boolean;
}

interface PlayerKeywordGrant {
  seat: Seat;
  keyword: string;
  amount?: number;
  duration: EffectDuration;
}

interface PlayerCustomEffectGrant {
  seat: Seat;
  ownerSeat: Seat;
  token: string;
  duration: EffectDuration;
  activationIdentity: object;
  matches: (permanentId: string) => boolean;
}

/**
 * A positive attack-legality grant: the attacker MAY also attack an opponent's
 * unsuspended Digimon (rule implementation, e.g. ST12-08). The base
 * rule lets a Digimon attack only a SUSPENDED defender; this grant relaxes that for the
 * granted attacker while active. Read by combat/legality.canAttackTarget.
 */
interface CanAttackUnsuspendedGrant {
  permanentId: string;
  duration: EffectDuration;
  continuous?: boolean;
  /** Grant only applies to defenders with no digivolution cards (EX1-016/BT7-095). */
  noDigivolutionCards?: boolean;
  /** Grant only applies to defenders at or below this printed level (EX1-061). */
  defenderLevelMax?: number;
}

interface VortexCanAttackPlayersGrant {
  permanentId: string;
  duration: EffectDuration;
  continuous?: boolean;
}

/**
 * An ARMED "suspend-restriction-with-superlative-exception" source (BT23-024). The source
 * permanent's [All Turns] link trigger arms this for a duration ("until their turn ends" =>
 * UntilOpponentTurnEnd). While armed, the continuous-recompute pass re-derives the affected
 * opponent set (all opponent Digimon MINUS the recomputed highest-play-cost one) and records a
 * fresh `suspend` restriction per affected permanent — so the exempt set tracks board changes
 * each pass (KB BT23-024 Q5250/Q5252 recompute). The armed marker itself is a one-shot,
 * duration-scoped entry (NOT continuous): it survives recomputes and clears at its boundary.
 */
interface SuspendRestrictionSource {
  permanentId: string;
  duration: EffectDuration;
}

interface UnsuspendedDigivolveProhibition {
  seat: Seat;
  sourceSeat: Seat;
  duration: EffectDuration;
}

/**
 * A positive digivolve-target constraint (EX10-035 "this Digimon can only digivolve into
 * [Apocalymon]"). The permanent may digivolve ONLY into a card whose definition satisfies
 * `matchesInto`; the digivolve-legality check rejects any other evolving card. The matcher is
 * supplied by the IR interpreter (built from the action's `into` filter) so the ledger stays
 * decoupled from the filter shape.
 */
interface DigivolveIntoConstraint {
  permanentId: string;
  matchesInto: (def: CardDefinition) => boolean;
  duration: EffectDuration;
  continuous?: boolean;
}

interface ColorWaiver {
  /** The instance whose color requirement is waived (a card in hand/security). */
  instanceId: string;
  /**
   * When set, the requirement is NOT waived outright: this colour ALSO satisfies it
   * ("Black also meets this card's colour requirements" — the LM Memory Boost family).
   * Absent means the blanket "you can ignore this card's colour requirements" waiver.
   */
  alsoColor?: CardColor;
  duration: EffectDuration;
  continuous?: boolean;
}

interface KeywordGrant {
  permanentId: string;
  /** The granted keyword name (e.g. "Blocker", "Rush", "Jamming"). */
  keyword: string;
  /** Optional numeric param (e.g. Security Attack +N). */
  amount?: number;
  duration: EffectDuration;
  continuous?: boolean;
  /** Live recipient condition for duration-scoped conditional grants. */
  active?: () => boolean;
  /** Parameterized keyword alternatives, e.g. Decoy (Black/White). */
  specifiers?: string[];
  /** Exact card/clause that granted the keyword, including inherited sources. */
  sourceCardId?: string;
  sourceEffectText?: string;
  /** Provenance used to suppress (but retain) opponent-granted effects under immunity. */
  sourceSeat?: Seat;
  sourceKinds?: string[];
}

interface LinkMaxGrant {
  permanentId: string;
  /** Signed change to the link limit (`<Link +1>` => 1, `<Link +2>` => 2). */
  delta: number;
  duration: EffectDuration;
  continuous?: boolean;
}

/**
 * A recipient-scoped LINK-cost-reduction grant (documented behavior `rule implementation` +
 * `UntilCalculateFixedCostEffect`, documented behavior). Keyed by the RECIPIENT permanent (the
 * Digimon a card would link TO): while active, a would-link card whose definition carries one of
 * `traits` has its link cost reduced by `amount`. `runLink`/`linkCostOf` read the recipient's
 * grant in addition to the declaring action's `costDelta`. Per KB BT25-089 Q6423 the reductions
 * do NOT stack on one declaration, so the read (`linkCostReduction`) returns the LARGEST single
 * matching grant rather than their sum. Real authoritative state, never client-supplied; cleared
 * and re-derived each continuous-recompute pass (CR-01) like every other continuous grant.
 */
export interface LinkCostReductionGrant {
  /** The link recipient the reduction is installed on. */
  permanentId: string;
  /** Magnitude of the reduction (positive). */
  amount: number;
  /** Lowercased trait tokens a would-link card must carry for the reduction to apply. */
  traits: string[];
  duration: EffectDuration;
  continuous?: boolean;
  sourceInstanceId?: string;
  controllerSeat?: Seat;
  optional?: boolean;
  oncePerTurnKey?: string;
}

interface KindGrant {
  permanentId: string;
  /** Granted kind(s) — e.g., a Tamer becoming [Digimon]. */
  kinds: CardKind[];
  duration: EffectDuration;
  continuous?: boolean;
}

/**
 * A seat-level "players can't ignore digivolution requirements" rule (documented behavior
 * `rule implementation`, documented behavior; KB Q1738-Q1743). When active for a seat,
 * that seat may not use effects that IGNORE digivolution requirements (Q1741/Q1742); DNA/Burst,
 * no-cost digivolves, and adding-info effects are unaffected. The digivolve-legality path's
 * ignore-requirements hook consults `cannotIgnoreDigivolution(seat)`. (BT8-059 installs it for
 * BOTH seats — Q1738.) The substrate that this WOULD suppress — an in-engine ignore-requirements
 * path — does not yet exist, so the read currently has no caller; the flag is faithful authored
 */
interface CannotIgnoreDigivolutionFlag {
  seat: Seat;
  duration: EffectDuration;
  continuous?: boolean;
}

interface SecurityAddRestriction {
  blockedEffectSeat: Seat;
  granterSeat: Seat;
  duration: EffectDuration;
}

/**
 * A continuously-derived COLOR conferred onto a permanent ("[Your Turn] This Digimon is
 * also treated as blue"). The permanent's EFFECTIVE color set is its printed colors UNIONED
 * (BaseCardColors then each active IChangeCardColorEffect.GetCardColors appends, then
 * Distinct; documented behavior). Recorded as real authoritative server state, never supplied
 * by a client; the color-legality consumers (digivolve EvoCost color check, play-time color
 * requirement) read the effective set, not just the printed colors.
 */
interface ColorGrant {
  permanentId: string;
  /** The granted color name (CardColor value, e.g. "Blue"). */
  color: string;
  duration: EffectDuration;
  continuous?: boolean;
}

/**
 * A "this Digimon's stacked cards can't be trashed by the opponent's effects" lock (EX11-070's
 * `permanentId`, an OPPONENT effect may not trash its digivolution-stack cards (TrashDigivolution
 * and `<De-Digivolve>`); the controller's OWN effects are unaffected (documented behavior EffectCondition =
 * IsOpponentEffect). The opponent-vs-own scope is resolved at the trash site (the host's
 * controller vs the trashing effect's seat), so the entry itself carries only the protected
 * permanent and its duration. Re-derived each continuous-recompute pass (CR-01).
 */
interface StackTrashLock {
  permanentId: string;
  duration: EffectDuration;
  continuous?: boolean;
}

/** One specific digivolution card that effects cannot trash (BT9-109 X Antibody). */
interface StackCardTrashLock {
  instanceId: string;
  ownerSeat: Seat;
  duration: EffectDuration;
  continuous?: boolean;
}

interface SecurityAttackInversion {
  permanentId: string;
  duration: EffectDuration;
  continuous?: boolean;
}

/** Stack-card effects conferred onto a permanent (GrantStatic grant:"effects"). */
export interface StackEffectConferral {
  targetPermanentId: string;
  stackInstanceId: string;
  continuous?: boolean;
  /** Limit the copied effects to the printed trigger (for example, only [Main]). */
  trigger?: string;
  /** When true, do not confer inherited effects from the matched stack card. */
  excludeInherited?: boolean;
  inheritedOnly?: boolean;
  /** Physical source of the grant; distinct grant sources confer distinct effect copies (Q1943). */
  granterInstanceId?: string;
}

/**
 * A permanent whose `[On Deletion]` effects are ALSO offered at the end of its own attack
 * (BT16-015 Phoenixmon (X Antibody): "attach [End of Attack] to all of this Digimon's
 * [On Deletion] effects"). The projection names the permanent only — the collector re-derives
 * which effects it reaches from live board state each pass, so an [On Deletion] gained or lost
 * meanwhile is picked up without a second ledger.
 *
 * Always a CONTINUOUS entry, even when the granting clause is the discrete `[When Digivolving]`
 * twin of the same printed sentence: the projection lasts exactly as long as its `[Your Turn]`
 * source clause applies, and clear-then-recompute is what makes it lapse the instant that clause
 * stops (KB BT16-015 Q2615 — a mid-attack ＜De-Digivolve＞ that removes the source clause stops
 * the projected copies from activating).
 */
export interface OnDeletionAtEndOfAttackProjection {
  permanentId: string;
  duration: EffectDuration;
  continuous?: boolean;
}

/**
 * A named custom effect granted onto a permanent for a duration (GrantStatic grant:"effects"
 * timing)` path — RB1-030 grants "[On Deletion] Delete 1 of your opponent's Digimon with the
 * lowest level" until the end of the opponent's turn). Unlike a stack-effect conferral this is a
 * one-shot DURATION-scoped grant (NOT recomputed each continuous pass): it is installed once when
 * the granting effect resolves and lapses at its boundary or when the host permanent leaves the
 * field. The collector compiles `token` to the granted permanent's [On Deletion] effect so it
 * fires through the SAME OnDestroyedAnyone window as a printed [On Deletion].
 */
export interface CustomEffectGrant {
  /** Stable identity for this materialized grant, used to distinguish stacked effect copies. */
  grantId: number;
  /**
   * The granted card's TOP-CARD instance id (NOT a permanent id). Anchoring on the instance is
   * what lets a granted [On Deletion] still fire on its OWN deletion: when the granted Digimon is
   * deleted its permanent ledgers are dropped, but the instance persists into trash, where the
   * deletion-window collector re-finds it (exactly as a printed [On Deletion] is collected from
   * trash). The instanceId is unique per match, so the grant cannot mis-fire on a reused id.
   */
  instanceId: string;
  /** Seat the duration sweep is framed from (the granter's seat = the granted card's owner). */
  ownerSeat: Seat;
  token: string;
  duration: EffectDuration;
  /** One already-resolved granting effect. Equal identities are repeat materializations, not stacks. */
  activationIdentity?: object;
  /** Live affected-state gate for a duration-scoped aura grant. */
  isActive?: () => boolean;
  /** Persistent clauses are cleared and re-derived on every continuous recompute. */
  continuous?: boolean;
}

interface MemoryGainPolicy {
  /** Seat whose memory gain is restricted. */
  seat: Seat;
  exceptTamerEffects: true;
  duration: EffectDuration;
  continuous?: boolean;
}

interface CostReductionBlock {
  seat: Seat;
  costType: "play" | "digivolve" | "all";
  duration: EffectDuration;
  continuous?: boolean;
}

/**
 * Seat-level play/move prohibition (rule implementation / rule implementation / rule implementation).
 * `seat` is the RESTRICTED player whose own actions/effects may not play/move a card matching
 * `CardCondition` (kind/DP predicate) plus the implicit `cardSource.Owner == card.Owner.Enemy`
 * seat scope. A continuously-re-evaluated GATE (`when`) makes the lock lapse the instant the
 * gate fails (BT8-057's "[Opponent's Turn] while all your Digimon are suspended"); when absent
 * the prohibition is live for its whole duration.
 */
interface PlayProhibition {
  /** The restricted seat (the player whose plays/moves are forbidden) — used for matching. */
  seat: Seat;
  /**
   * The SOURCE effect's owner seat — used for the duration sweep, because the IR durations
   * (untilOpponentTurnEnd / forTheTurn) are framed from the source's perspective (e.g.
   * UntilOpponentTurnEnd = the end of the SOURCE's opponent's turn). The restricted seat is
   * the source's opponent, so this is normally opponentOf(seat).
   */
  sourceSeat: Seat;
  /** Predicate over a card definition (Option, or Digimon with DP <= a cap). */
  match: PlayMatch;
  mode: "play" | "move" | "playOrMove";
  /**
   * When true, this prohibition applies only to effect-driven plays (not the player's own
   * normal hand-play action). The normal play-card gate skips these; the effect-play gate
   * in the interpreter honors them. KB Q4665–Q4668, Q6245 (BT20-020).
   */
  byEffectOnly?: boolean;
  duration: EffectDuration;
  continuous?: boolean;
}

/** A serializable card-definition predicate for a PlayProhibition (mirrors the IR Filter subset). */
export interface PlayMatch {
  /** Card kinds the prohibition matches; empty/undefined => any kind. */
  kinds?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
  /** Upper DP bound for the "Digimon with N DP or less" form (printed DP). */
  dpAtMost?: number;
  /**
   * Treat synthetic Digimon tokens as matching the Digimon kind. Most play prohibitions
   * exempt tokens, but cards whose ruling explicitly includes them (BT14-017/Q2381) opt in.
   */
  allowTokens?: boolean;
  /** Loose-card origin zones matched by the prohibition; undefined means every origin. */
  fromZones?: ZoneRef[];
}

/** A timing window a `DisableTimingEffect` masks (mirrors the IR `DisableTiming`). */
export type DisableTimingMask = "whenDigivolving" | "whenAttacking" | "onPlay";

/**
 * Security-effect disable (the security half of the source `rule implementation` split):
 * while `attackerPermanentId` is the attacker, a flipped security card's [Security] effect
 * does not activate. `sourceKind` "option" suppresses only Option security effects (the
 * card's `EffectSourceCard.IsOption` gate); "any" suppresses any security effect.
 */
interface SecurityEffectDisable {
  /** The attacking permanent the disable is attached to (documented behavior `card.PermanentOfThisCard()`). */
  attackerPermanentId?: string;
  /** Player-wide form: every attacking permanent controlled by this seat matches. */
  attackerSeat?: Seat;
  sourceKind: "option" | "any";
  duration: EffectDuration;
  continuous?: boolean;
}

/**
 * Timing-effect disable (the timing half of the source `rule implementation` split): the
 * masked [When Digivolving] / [When Attacking] / [On Play] effects of `permanentId` do not
 * activate. Consulted by the per-effect activation gate, with the `beAffected`
 */
interface EffectTimingDisable {
  /** The permanent whose timing effects are suppressed. */
  permanentId: string;
  /** Which timing windows are masked. */
  timings: DisableTimingMask[];
  duration: EffectDuration;
  continuous?: boolean;
}

interface DnaLevelOverride {
  permanentId: string;
  level: number;
  intoNames?: string[];
  continuous?: boolean;
}

/** Which boundary clears a continuous duration (mirrors modifiers.clearsAt). */
function clearsAt(duration: EffectDuration, boundary: DurationBoundary, ownerSeat: Seat, sweepSeat: Seat): boolean {
  switch (duration) {
    case EffectDuration.UntilOwnerTurnEnd:
      return (boundary === "ownerTurnEnd" || boundary === "eachTurnEnd") && ownerSeat === sweepSeat;
    case EffectDuration.UntilOpponentTurnEnd:
      return (
        (boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd" || boundary === "eachTurnEnd") &&
        ownerSeat !== sweepSeat
      );
    case EffectDuration.UntilEachTurnEnd:
      return boundary === "eachTurnEnd" || boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd";
    case EffectDuration.UntilEndAttack:
      return boundary === "endAttack" || boundary === "endBattle";
    case EffectDuration.UntilEndBattle:
      return boundary === "endBattle";
    case EffectDuration.UntilOwnerActivePhase:
      return boundary === "ownerActivePhase" && ownerSeat === sweepSeat;
    case EffectDuration.UntilNextUntap:
      return boundary === "nextUntap" && ownerSeat === sweepSeat;
    case EffectDuration.UntilCalculateFixedCost:
      return boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd" || boundary === "eachTurnEnd";
    case EffectDuration.Permanent:
      // A genuinely-permanent grant is never cleared by any boundary sweep (WR-03 / ENG-02).
      return false;
    default:
      return false;
  }
}

export class ContinuousEffectLedger {
  private restrictions: RestrictionEntry[] = [];
  private playerRestrictions: PlayerRestrictionEntry[] = [];
  private attackTargetRestrictions: AttackTargetRestriction[] = [];
  private canAttackUnsuspendedGrants: CanAttackUnsuspendedGrant[] = [];
  private vortexCanAttackPlayersGrants: VortexCanAttackPlayersGrant[] = [];
  private suspendRestrictionSources: SuspendRestrictionSource[] = [];
  private unsuspendedDigivolveProhibitions: UnsuspendedDigivolveProhibition[] = [];
  private digivolveIntoConstraints: DigivolveIntoConstraint[] = [];
  private nameTraitGrants: NameTraitGrant[] = [];
  private originalCardInfoOverrides: OriginalCardInfoOverride[] = [];
  private colorWaivers: ColorWaiver[] = [];
  private keywordGrants: KeywordGrant[] = [];
  private playerKeywordGrants: PlayerKeywordGrant[] = [];
  private playerCustomEffectGrants: PlayerCustomEffectGrant[] = [];
  /** Break dependency cycles while a conditional grant asks about other live keywords. */
  private evaluatingKeywordGrants = new Set<KeywordGrant>();
  private linkMaxGrants: LinkMaxGrant[] = [];
  private linkCostReductionGrants: LinkCostReductionGrant[] = [];
  private kindGrants: KindGrant[] = [];
  private cannotIgnoreDigivolutionFlags: CannotIgnoreDigivolutionFlag[] = [];
  private securityAddRestrictions: SecurityAddRestriction[] = [];
  private colorGrants: ColorGrant[] = [];
  private stackTrashLocks: StackTrashLock[] = [];
  private stackCardTrashLocks: StackCardTrashLock[] = [];
  private securityAttackInversions: SecurityAttackInversion[] = [];
  private stackEffectConferrals: StackEffectConferral[] = [];
  private onDeletionAtEndOfAttackProjections: OnDeletionAtEndOfAttackProjection[] = [];
  private customEffectGrants: CustomEffectGrant[] = [];
  private nextCustomEffectGrantId = 1;
  private memoryGainPolicies: MemoryGainPolicy[] = [];
  private costReductionBlocks: CostReductionBlock[] = [];
  private playProhibitions: PlayProhibition[] = [];
  private securityEffectDisables: SecurityEffectDisable[] = [];
  private effectTimingDisables: EffectTimingDisable[] = [];
  private dnaLevelOverrides: DnaLevelOverride[] = [];

  /** Record a "can't <restriction>" rule on a permanent for a duration. */
  addRestriction(
    permanentId: string,
    restriction: Restriction,
    duration: EffectDuration,
    opts?: { continuous?: boolean; fromSourceKind?: string[]; byOpponentEffectsOnly?: boolean },
  ): void {
    this.restrictions.push({
      permanentId,
      restriction,
      duration,
      continuous: opts?.continuous,
      fromSourceKind: opts?.fromSourceKind,
      byOpponentEffectsOnly: opts?.byOpponentEffectsOnly,
    });
  }

  /** Record a duration-scoped rule for every matching permanent a player controls, including future entrants. */
  addPlayerRestriction(
    seat: Seat,
    ownerSeat: Seat,
    restriction: Restriction,
    duration: EffectDuration,
    matches: (permanentId: string) => boolean,
    opts?: { continuous?: boolean },
  ): void {
    this.playerRestrictions.push({ seat, ownerSeat, restriction, duration, matches, continuous: opts?.continuous });
  }

  addUnsuspendedDigivolveProhibition(seat: Seat, sourceSeat: Seat, duration: EffectDuration): void {
    this.unsuspendedDigivolveProhibitions.push({ seat, sourceSeat, duration });
  }

  isUnsuspendedDigivolveProhibited(seat: Seat): boolean {
    return this.unsuspendedDigivolveProhibitions.some((entry) => entry.seat === seat);
  }

  /**
   * Whether a permanent currently has a given restriction from any active entry.
   *
   * `sourceKind` is the kind of the card producing the effect being gated (e.g.
   * `"Digimon"`). When an entry carries `fromSourceKind`, it blocks ONLY when the
   * sourceKind is known AND in the list. An unqualified entry (no `fromSourceKind`)
   * blocks regardless of source.
   *
   * `opts.byOpponentEffect` says whether the effect being gated is controlled by the
   * restricted permanent's opponent, which is what a `byOpponentEffectsOnly` entry keys
   * on. Leaving it undefined makes such an entry block anyway: a prohibiting effect takes
   * precedence (Comprehensive Rules §15-1-3), and over-blocking surfaces as a failing test
   * whereas under-blocking is the silent no-op this scoping exists to prevent.
   */
  hasRestriction(
    permanentId: string,
    restriction: Restriction,
    sourceKind?: string,
    opts?: { byOpponentEffect?: boolean },
  ): boolean {
    // Printed "can't suspend" effects are recorded as `beSuspended` by the
    // interpreter so effect-driven suspension can honor them. The combat
    // legality reader uses the public `suspend` vocabulary for the implicit
    // suspend that starts a normal attack. Treat the two spellings as the
    // same prohibition at this read boundary; otherwise cards such as
    // EX8-026 would block effect suspension but still allow attacks.
    const equivalentRestrictions =
      restriction === "suspend" || restriction === "beSuspended"
        ? new Set<Restriction>(["suspend", "beSuspended"])
        : new Set<Restriction>([restriction]);
    const individuallyRestricted = this.restrictions.some((r) => {
      if (r.permanentId !== permanentId || !equivalentRestrictions.has(r.restriction)) return false;
      if (r.byOpponentEffectsOnly === true && opts?.byOpponentEffect === false) return false;
      if (r.fromSourceKind === undefined) return true;
      // Qualified entry: block only when sourceKind is known and matches.
      return sourceKind !== undefined && r.fromSourceKind.includes(sourceKind);
    });
    if (individuallyRestricted) return true;
    // A player-scoped restriction can name ANY permanent kind ("none of your opponent's Tamers
    // can unsuspend" — LM-010), so it resolves the controller through the kind-agnostic lookup.
    // `controllerSeatOf` deliberately answers only for Digimon (it also drives the
    // Digimon-only player KEYWORD grants) and would silently drop every Tamer here.
    const controllerSeat = this.anyControllerSeatOf?.(permanentId) ?? this.controllerSeatOf?.(permanentId);
    return this.playerRestrictions.some(
      (entry) => entry.seat === controllerSeat && entry.restriction === restriction && entry.matches(permanentId),
    );
  }

  /** Number of independently-stacking copies of a restriction on one permanent. */
  restrictionCount(permanentId: string, restriction: Restriction): number {
    return this.restrictions.filter((entry) => entry.permanentId === permanentId && entry.restriction === restriction)
      .length;
  }

  /** Record a target-scoped "can't attack this Digimon" rule. */
  addAttackTargetRestriction(
    attackerPermanentId: string,
    targetPermanentId: string,
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.attackTargetRestrictions.push({
      attackerPermanentId,
      targetPermanentId,
      duration,
      continuous: opts?.continuous,
    });
  }

  /** Whether this exact attacker is prohibited from attacking this exact defender. */
  cannotAttackTarget(attackerPermanentId: string, targetPermanentId: string): boolean {
    return this.attackTargetRestrictions.some(
      (entry) => entry.attackerPermanentId === attackerPermanentId && entry.targetPermanentId === targetPermanentId,
    );
  }

  restrictSecurityAddsFromEffect(blockedEffectSeat: Seat, granterSeat: Seat, duration: EffectDuration): void {
    this.securityAddRestrictions.push({ blockedEffectSeat, granterSeat, duration });
  }

  cannotAddSecurityFromEffect(effectSeat: Seat | undefined): boolean {
    return (
      effectSeat !== undefined && this.securityAddRestrictions.some((entry) => entry.blockedEffectSeat === effectSeat)
    );
  }

  /**
   * Arm a BT23-024 suspend-restriction source for `duration` ("until their turn ends" =>
   * UntilOpponentTurnEnd). Idempotent per source while armed: the link trigger fires at most
   * once per turn, and re-arming the same source within a duration just refreshes the entry.
   */
  armSuspendRestrictionSource(permanentId: string, duration: EffectDuration): void {
    if (this.suspendRestrictionSources.some((s) => s.permanentId === permanentId)) return;
    this.suspendRestrictionSources.push({ permanentId, duration });
  }

  /** Whether a BT23-024 source is currently armed (read by the continuous recompute). */
  hasSuspendRestrictionSource(permanentId: string): boolean {
    return this.suspendRestrictionSources.some((s) => s.permanentId === permanentId);
  }

  /**
   * Record a positive "can only digivolve into [X]" constraint on a permanent (EX10-035).
   * `matchesInto` is satisfied by the allowed evolving card's definition.
   */
  addDigivolveIntoConstraint(
    permanentId: string,
    matchesInto: (def: CardDefinition) => boolean,
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.digivolveIntoConstraints.push({ permanentId, matchesInto, duration, continuous: opts?.continuous });
  }

  /**
   * Whether digivolving `permanentId` into a card with definition `evolvingDef` is allowed by every
   * active `digivolveExceptInto` constraint on it. With no constraint => allowed (the base rule).
   * With one or more => allowed only if EVERY constraint's `matchesInto` accepts the evolving card.
   */
  digivolveIntoAllowed(permanentId: string, evolvingDef: CardDefinition): boolean {
    return this.digivolveIntoConstraints
      .filter((c) => c.permanentId === permanentId)
      .every((c) => c.matchesInto(evolvingDef));
  }

  /** Grant a permanent the ability to also attack opponent unsuspended Digimon. */
  grantCanAttackUnsuspended(
    permanentId: string,
    duration: EffectDuration,
    opts?: { continuous?: boolean; noDigivolutionCards?: boolean; defenderLevelMax?: number },
  ): void {
    this.canAttackUnsuspendedGrants.push({
      permanentId,
      duration,
      continuous: opts?.continuous,
      noDigivolutionCards: opts?.noDigivolutionCards,
      defenderLevelMax: opts?.defenderLevelMax,
    });
  }

  /** Whether a permanent may also attack opponent unsuspended Digimon (positive grant). */
  canAttackUnsuspended(permanentId: string): boolean {
    return this.canAttackUnsuspendedGrants.some((g) => g.permanentId === permanentId);
  }

  /**
   * Whether EVERY active "can attack unsuspended" grant on this permanent is restricted to
   * defenders with no digivolution cards. Used by combat legality to narrow the defender set
   * for grants like EX1-016 ("...unsuspended Digimon with no digivolution cards"). Returns
   * false when no grant exists or when any grant is unrestricted (ST12-08 widens it back).
   */
  canAttackUnsuspendedRequiresNoDigivolution(permanentId: string): boolean {
    const grants = this.canAttackUnsuspendedGrants.filter((g) => g.permanentId === permanentId);
    return grants.length > 0 && grants.every((g) => g.noDigivolutionCards === true);
  }

  /** Whether at least one active grant accepts this exact unsuspended defender. */
  canAttackUnsuspendedTarget(
    permanentId: string,
    defender: { level?: number; hasDigivolutionCards: boolean },
  ): boolean {
    return this.canAttackUnsuspendedGrants.some((grant) => {
      if (grant.permanentId !== permanentId) return false;
      if (grant.noDigivolutionCards === true && defender.hasDigivolutionCards) return false;
      if (
        grant.defenderLevelMax !== undefined &&
        (defender.level === undefined || defender.level > grant.defenderLevelMax)
      )
        return false;
      return true;
    });
  }

  grantVortexCanAttackPlayers(permanentId: string, duration: EffectDuration, opts?: { continuous?: boolean }): void {
    this.vortexCanAttackPlayersGrants.push({ permanentId, duration, continuous: opts?.continuous });
  }

  /** Whether a permanent's ＜Vortex＞ attack may also target a player (positive grant). */
  vortexCanAttackPlayers(permanentId: string): boolean {
    return this.vortexCanAttackPlayersGrants.some((g) => g.permanentId === permanentId);
  }

  /** Record a seat-level memory gain lock (rule implementation). */
  addMemoryGainPolicy(seat: Seat, duration: EffectDuration, opts?: { continuous?: boolean }): void {
    this.memoryGainPolicies.push({
      seat,
      exceptTamerEffects: true,
      duration,
      continuous: opts?.continuous,
    });
  }

  /**
   * May `seat` gain memory from an effect whose source is `effectSource`?
   * Mirrors ICannotAddMemoryEffect: blocked when a policy applies and the effect
   * is not a Tamer effect.
   */
  canGainMemoryFromEffect(seat: Seat, effectSource: { definition: { kinds: readonly string[] } } | undefined): boolean {
    const blocked = this.memoryGainPolicies.some((p) => p.seat === seat);
    if (!blocked) return true;
    if (effectSource === undefined) return false;
    return effectSource.definition.kinds.includes(CardKind.Tamer);
  }

  /** Record that `seat` may not reduce play/digivolve costs. */
  addCostReductionBlock(
    seat: Seat,
    costType: "play" | "digivolve" | "all",
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.costReductionBlocks.push({ seat, costType, duration, continuous: opts?.continuous });
  }

  /** Whether cost reductions are forbidden for `seat` and `costType`. */
  blocksCostReduction(seat: Seat, costType: "play" | "digivolve"): boolean {
    return this.costReductionBlocks.some((b) => b.seat === seat && (b.costType === "all" || b.costType === costType));
  }

  /**
   * Record a seat-level play/move prohibition (rule implementation / rule implementation). `seat` is the
   * RESTRICTED player; `sourceSeat` is the effect owner whose perspective the `duration` is
   * framed from (normally opponentOf(seat)).
   */
  addPlayProhibition(
    seat: Seat,
    sourceSeat: Seat,
    match: PlayMatch,
    mode: "play" | "move" | "playOrMove",
    duration: EffectDuration,
    opts?: { continuous?: boolean; byEffectOnly?: boolean },
  ): void {
    this.playProhibitions.push({
      seat,
      sourceSeat,
      match,
      mode,
      duration,
      continuous: opts?.continuous,
      byEffectOnly: opts?.byEffectOnly,
    });
  }

  /**
   * Is `seat` forbidden from playing/moving `cardDef` right now? `seat` is the player whose
   * own ACTION or EFFECT is performing the play/move — for a manual play that is the playing
   * player; for an effect-driven play it is the seat the resolving effect is attributed to
   * (so a "your opponent can't play" effect blocks the opponent's actions and effects, but
   * NOT the source player's effects: KB EX7-014 Q4675/Q4676). Token plays are exempt by default
   * (Q3834), unless the active match explicitly opts into them.
   * `requestedMode` is "play" (play / enter-field, incl. breeding) or "move" (effect-driven
   * or breeding move); a "playOrMove" prohibition matches either.
   * `effectPlay` true means the caller is an effect-driven play path — prohibitions with
   * `byEffectOnly: true` are honored; when false/absent those prohibitions are skipped so
   * normal hand-play is unaffected (KB Q4665–Q4668, Q6245 BT20-020).
   */
  isPlayBlocked(
    seat: Seat,
    cardDef: CardDefinition,
    requestedMode: "play" | "move",
    effectPlay?: boolean,
    fromZone?: ZoneRef,
  ): boolean {
    return this.playProhibitions.some(
      (p) =>
        p.seat === seat &&
        modeMatches(p.mode, requestedMode) &&
        playMatchesCard(p.match, cardDef) &&
        (p.match.fromZones === undefined || (fromZone !== undefined && p.match.fromZones.includes(fromZone))) &&
        (effectPlay === true || !p.byEffectOnly),
    );
  }

  /**
   * Record a security-effect disable: while `attackerPermanentId` is the attacker, a flipped
   * security card's [Security] effect does not activate (`sourceKind` "option" => only Option
   * security effects; "any" => any). The security half of the source rule implementation split.
   */
  addSecurityEffectDisable(
    attackerPermanentId: string,
    sourceKind: "option" | "any",
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.securityEffectDisables.push({
      attackerPermanentId,
      sourceKind,
      duration,
      continuous: opts?.continuous,
    });
  }

  addSecurityEffectDisableForSeat(
    attackerSeat: Seat,
    sourceKind: "option" | "any",
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.securityEffectDisables.push({ attackerSeat, sourceKind, duration, continuous: opts?.continuous });
  }

  /**
   * Is the [Security] effect of `securityCard` (definition `securityDef`) suppressed while
   * `attackerPermanentId` is the attacker? True when a disable on that attacker matches —
   * "any" suppresses every security effect; "option" only when the security card is an Option
   *. Consulted in the security-check resolution
   * loop; the card is still trashed (KB Q886), only the effect is skipped.
   */
  isSecurityEffectDisabled(attackerPermanentId: string, securityDef: CardDefinition): boolean {
    const isOption = securityDef.kinds.includes(CardKind.Option);
    return this.securityEffectDisables.some(
      (d) =>
        (d.attackerPermanentId === attackerPermanentId ||
          (d.attackerSeat !== undefined && d.attackerSeat === this.controllerSeatOf?.(attackerPermanentId))) &&
        (d.sourceKind === "any" || isOption),
    );
  }

  /**
   * Record a timing-effect disable: the masked [When Digivolving] / [When Attacking] /
   * [On Play] effects of `permanentId` do not activate. The timing half of the source
   * rule implementation split.
   */
  addEffectTimingDisable(
    permanentId: string,
    timings: DisableTimingMask[],
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.effectTimingDisables.push({ permanentId, timings, duration, continuous: opts?.continuous });
  }

  /**
   * Is `timing` masked on `permanentId` right now (so its effect at that window may not
   * activate)? Consulted by the per-effect activation gate; callers apply the `beAffected`
   */
  isTimingEffectDisabled(permanentId: string, timing: DisableTimingMask): boolean {
    return this.effectTimingDisables.some((d) => d.permanentId === permanentId && d.timings.includes(timing));
  }

  /** Record a name/trait alias on a permanent (e.g. "also treated as [Leomon]"). */
  addNameTraitGrant(
    permanentId: string,
    kind: "name" | "trait",
    tokens: string[],
    duration: EffectDuration,
    opts?: { continuous?: boolean; digiXrosOnly?: boolean; dynamicTokens?: () => string[] },
  ): void {
    this.nameTraitGrants.push({
      permanentId,
      kind,
      tokens,
      duration,
      continuous: opts?.continuous,
      digiXrosOnly: opts?.digiXrosOnly,
      dynamicTokens: opts?.dynamicTokens,
    });
  }

  /** Extra name aliases granted to a permanent (lowercased tokens), excluding DigiXros-only grants. */
  grantedNames(permanentId: string): string[] {
    return this.nameTraitGrants
      .filter((g) => g.permanentId === permanentId && g.kind === "name" && !g.digiXrosOnly)
      .flatMap((g) =>
        g.dynamicTokens ? g.dynamicTokens().map((t) => t.toLowerCase()) : g.tokens.map((t) => t.toLowerCase()),
      );
  }

  /**
   * Name aliases granted to a permanent that are ONLY valid for DigiXros material matching
   * (lowercased tokens). These must NOT appear in effectiveNames() or ordinary name checks.
   */
  grantedDigiXrosNames(permanentId: string): string[] {
    return this.nameTraitGrants
      .filter((g) => g.permanentId === permanentId && g.kind === "name" && g.digiXrosOnly === true)
      .flatMap((g) => g.tokens.map((t) => t.toLowerCase()));
  }

  /** Extra trait aliases granted to a permanent (lowercased tokens). */
  grantedTraits(permanentId: string): string[] {
    return this.nameTraitGrants
      .filter((g) => g.permanentId === permanentId && g.kind === "trait")
      .flatMap((g) => g.tokens.map((t) => t.toLowerCase()));
  }

  addOriginalCardInfoOverride(
    permanentId: string,
    info: { name?: string; colors?: string[] },
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.originalCardInfoOverrides.push({ permanentId, ...info, duration, continuous: opts?.continuous });
  }

  originalCardInfoOverride(permanentId: string): { name?: string; colors?: string[] } | undefined {
    const entries = this.originalCardInfoOverrides.filter((entry) => entry.permanentId === permanentId);
    if (entries.length === 0) return undefined;
    return Object.assign(
      {},
      ...entries.map(({ name, colors }) => ({
        ...(name === undefined ? {} : { name }),
        ...(colors === undefined ? {} : { colors }),
      })),
    );
  }

  /**
   * Record that an instance may be used/played without meeting its color requirement, or —
   * with `alsoColor` — that one extra colour ALSO satisfies the printed requirement.
   */
  addColorWaiver(
    instanceId: string,
    duration: EffectDuration,
    opts?: { continuous?: boolean; alsoColor?: CardColor },
  ): void {
    this.colorWaivers.push({ instanceId, duration, continuous: opts?.continuous, alsoColor: opts?.alsoColor });
  }

  /** Whether an instance's color requirement is waived outright (no colour source needed). */
  hasColorWaiver(instanceId: string): boolean {
    return this.colorWaivers.some((w) => w.instanceId === instanceId && w.alsoColor === undefined);
  }

  /** Extra colours that currently also satisfy an instance's printed colour requirement. */
  colorRequirementAlternatives(instanceId: string): CardColor[] {
    return this.colorWaivers
      .filter((w) => w.instanceId === instanceId && w.alsoColor !== undefined)
      .map((w) => w.alsoColor as CardColor);
  }

  addDnaLevelOverride(permanentId: string, level: number, opts?: { intoNames?: string[]; continuous?: boolean }): void {
    this.dnaLevelOverrides.push({ permanentId, level, ...opts });
  }

  dnaLevelFor(permanentId: string, into: CardDefinition): number | undefined {
    return this.dnaLevelOverrides.find(
      (entry) =>
        entry.permanentId === permanentId &&
        (entry.intoNames === undefined || entry.intoNames.some((name) => into.nameEn.includes(name))),
    )?.level;
  }

  /**
   * Grant a keyword ability to a permanent for a duration ("gains ＜Blocker＞",
   * "gains ＜Rush＞ for the turn"). The combat / keyword-abilities subsystem reads
   * `grantedKeywords` at the relevant decision point; recorded now as real
   * authoritative state so the grant is not a silent no-op.
   * (＜Piercing＞ has its own dedicated pierce store in ModifierLedger; this is the
   * general store for every other keyword.)
   */
  addKeywordGrant(
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
      sourceSeat?: Seat;
      sourceKinds?: string[];
    },
  ): void {
    this.keywordGrants.push({
      permanentId,
      keyword,
      amount,
      duration,
      continuous: opts?.continuous,
      active: opts?.active,
      specifiers: opts?.specifiers,
      sourceCardId: opts?.sourceCardId,
      sourceEffectText: opts?.sourceEffectText,
      sourceSeat: opts?.sourceSeat,
      sourceKinds: opts?.sourceKinds,
    });
  }

  constructor(
    private readonly controllerSeatOf?: (permanentId: string) => Seat | undefined,
    private readonly printedKeywordsOfPermanent?: (permanentId: string) => readonly string[],
    private readonly anyControllerSeatOf?: (permanentId: string) => Seat | undefined,
  ) {}

  /** Grant a keyword to every current and future Digimon permanent controlled by `seat`. */
  addPlayerKeywordGrant(seat: Seat, keyword: string, duration: EffectDuration, amount?: number): void {
    this.playerKeywordGrants.push({ seat, keyword, amount, duration });
  }

  /** Grant a named custom effect to every matching current/future permanent controlled by `seat`. */
  addPlayerCustomEffectGrant(
    seat: Seat,
    ownerSeat: Seat,
    token: string,
    duration: EffectDuration,
    matches: (permanentId: string) => boolean,
  ): void {
    this.playerCustomEffectGrants.push({ seat, ownerSeat, token, duration, activationIdentity: {}, matches });
  }

  /** Return active player-scoped named grants that match a newly entered permanent. */
  playerCustomEffectsFor(permanentId: string, seat: Seat): readonly PlayerCustomEffectGrant[] {
    return this.playerCustomEffectGrants.filter((grant) => grant.seat === seat && grant.matches(permanentId));
  }

  /** Keywords currently granted to a permanent (with optional amounts). */
  grantedKeywords(permanentId: string): { keyword: string; amount?: number }[] {
    const direct = this.keywordGrants
      .filter((g) => g.permanentId === permanentId && this.keywordGrantIsActive(g))
      .map((g) => ({ keyword: g.keyword, amount: g.amount }));
    const seat = this.controllerSeatOf?.(permanentId);
    if (seat === undefined) return direct;
    return direct.concat(
      this.playerKeywordGrants
        .filter((grant) => grant.seat === seat)
        .map(({ keyword, amount }) => ({ keyword, amount })),
    );
  }

  /** Whether a permanent currently has a given keyword from any active grant. */
  hasKeyword(permanentId: string, keyword: string): boolean {
    const result =
      this.printedKeywordsOfPermanent?.(permanentId)?.includes(keyword) === true ||
      this.grantedKeywords(permanentId).some((grant) => grant.keyword === keyword);
    return result;
  }

  /** Active parameter alternatives carried by grants such as Decoy (Black/White). */
  keywordSpecifiers(permanentId: string, keyword: string): string[] {
    return this.keywordGrants
      .filter(
        (grant) => grant.permanentId === permanentId && grant.keyword === keyword && this.keywordGrantIsActive(grant),
      )
      .flatMap((grant) => grant.specifiers ?? []);
  }

  /** Active provenance records for a granted keyword, preserving inherited sources. */
  keywordGrantSources(
    permanentId: string,
    keyword: string,
  ): Array<{ sourceCardId?: string; effectText?: string; specifiers?: string[] }> {
    return this.keywordGrants
      .filter(
        (grant) => grant.permanentId === permanentId && grant.keyword === keyword && this.keywordGrantIsActive(grant),
      )
      .map(({ sourceCardId, sourceEffectText, specifiers }) => ({
        sourceCardId,
        effectText: sourceEffectText,
        specifiers,
      }));
  }

  private keywordGrantIsActive(grant: KeywordGrant): boolean {
    const recipientSeat = this.controllerSeatOf?.(grant.permanentId);
    if (grant.sourceSeat !== undefined && recipientSeat !== undefined && grant.sourceSeat !== recipientSeat) {
      const sourceKinds = grant.sourceKinds ?? [];
      const immune =
        sourceKinds.length === 0
          ? this.hasRestriction(grant.permanentId, "beAffected", undefined, { byOpponentEffect: true })
          : sourceKinds.some((kind) =>
              this.hasRestriction(grant.permanentId, "beAffected", kind, { byOpponentEffect: true }),
            );
      if (immune) return false;
    }
    if (grant.active === undefined) return true;
    // A conditional grant may inspect the recipient through permanentMatchesFilter,
    // which itself reads grantedKeywords. Exclude the grant currently being evaluated
    // from that nested read so it cannot recursively ask whether it is active forever.
    if (this.evaluatingKeywordGrants.has(grant)) return false;
    this.evaluatingKeywordGrants.add(grant);
    try {
      return grant.active();
    } finally {
      this.evaluatingKeywordGrants.delete(grant);
    }
  }

  /**
   * Remove the first active keyword grant matching both `permanentId` and `keyword`
   * (consume-on-resolve semantics for `＜Delay＞` gating: the grant is armed by
   * `GainKeyword(Delay)` on one turn and revoked here when the gated play fires).
   */
  removeKeywordGrant(permanentId: string, keyword: string): void {
    const idx = this.keywordGrants.findIndex((g) => g.permanentId === permanentId && g.keyword === keyword);
    if (idx !== -1) this.keywordGrants.splice(idx, 1);
  }

  /**
   * Record a `<Link +N>` grant raising a permanent's link limit by `delta`
   *. Read by `linkMax` (mindLink.ts);
   * lapses on dropPermanent / sweep / clearContinuous like every other grant.
   */
  addLinkMaxGrant(permanentId: string, delta: number, duration: EffectDuration, opts?: { continuous?: boolean }): void {
    this.linkMaxGrants.push({ permanentId, delta, duration, continuous: opts?.continuous });
  }

  /** Sum of every active `<Link +N>` delta granted to a permanent (0 when none). */
  linkMaxDelta(permanentId: string): number {
    return this.linkMaxGrants.filter((g) => g.permanentId === permanentId).reduce((total, g) => total + g.delta, 0);
  }

  /**
   * Record a recipient-scoped link-cost-reduction grant.
   * `traits` are matched case-insensitively against a would-link card's traits. Read by
   * `linkCostReduction`; lapses on dropPermanent / sweep / clearContinuous like every grant.
   */
  addLinkCostReductionGrant(
    permanentId: string,
    amount: number,
    traits: string[],
    duration: EffectDuration,
    opts?: {
      continuous?: boolean;
      sourceInstanceId?: string;
      controllerSeat?: Seat;
      optional?: boolean;
      oncePerTurnKey?: string;
    },
  ): void {
    this.linkCostReductionGrants.push({
      permanentId,
      amount,
      traits: traits.map((t) => t.toLowerCase()),
      duration,
      continuous: opts?.continuous,
      sourceInstanceId: opts?.sourceInstanceId,
      controllerSeat: opts?.controllerSeat,
      optional: opts?.optional,
      oncePerTurnKey: opts?.oncePerTurnKey,
    });
  }

  /**
   * The link-cost reduction that applies when a card with traits `cardTraits` would link to
   * `recipientId`. Per KB BT25-089 Q6423 multiple reductions do NOT stack on one link declaration,
   * so this returns the LARGEST single matching grant's amount (0 when none matches). A grant with
   * no `traits` (empty) applies to any would-link card.
   */
  linkCostReduction(recipientId: string, cardTraits: readonly string[]): number {
    return this.linkCostReductionGrant(recipientId, cardTraits)?.amount ?? 0;
  }

  /** Highest matching declaration-time grant that has not been consumed. */
  linkCostReductionGrant(
    recipientId: string,
    cardTraits: readonly string[],
    used: (key: string) => boolean = () => false,
  ): LinkCostReductionGrant | undefined {
    const lowered = cardTraits.map((t) => t.toLowerCase());
    let best: LinkCostReductionGrant | undefined;
    for (const g of this.linkCostReductionGrants) {
      if (g.permanentId !== recipientId) continue;
      if (g.oncePerTurnKey !== undefined && used(g.oncePerTurnKey)) continue;
      const traitOk = g.traits.length === 0 || g.traits.some((t) => lowered.includes(t));
      if (!traitOk) continue;
      if (best === undefined || g.amount > best.amount) best = g;
    }
    return best;
  }

  /**
   * Grant a card kind to a permanent for a duration ("this Tamer is also treated as
   * the exported `effectiveKinds` helper; lapses on dropPermanent / sweep /
   * clearContinuous like every other grant.
   */
  addKindGrant(
    permanentId: string,
    kinds: CardKind[],
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.kindGrants.push({ permanentId, kinds, duration, continuous: opts?.continuous });
  }

  /** Additional kinds currently granted to a permanent (CardKind values, deduplicated). */
  grantedKinds(permanentId: string): CardKind[] {
    const seen = new Set<CardKind>();
    for (const g of this.kindGrants) {
      if (g.permanentId === permanentId) g.kinds.forEach((k) => seen.add(k));
    }
    return [...seen];
  }

  /**
   * Record a seat-level "can't ignore digivolution requirements" rule (documented behavior
   * rule implementation). Read by `cannotIgnoreDigivolution`.
   */
  addCannotIgnoreDigivolution(seat: Seat, duration: EffectDuration, opts?: { continuous?: boolean }): void {
    this.cannotIgnoreDigivolutionFlags.push({ seat, duration, continuous: opts?.continuous });
  }

  /** Whether `seat` is currently barred from using ignore-digivolution-requirements effects. */
  cannotIgnoreDigivolution(seat: Seat): boolean {
    return this.cannotIgnoreDigivolutionFlags.some((f) => f.seat === seat);
  }

  /**
   * Grant a continuous additional color to a permanent for a duration ("[Your Turn] This
   * Digimon is also treated as blue"). The color-legality consumers (digivolve EvoCost color
   * check, play-time color requirement) read `grantedColors` and union it with the printed
   * authoritative state so the grant is not a silent no-op; it lapses when the source leaves
   * play (dropPermanent) or its duration/`when` gate stops holding (clearContinuous +
   * recompute), exactly like a granted keyword.
   */
  addColorGrant(permanentId: string, color: string, duration: EffectDuration, opts?: { continuous?: boolean }): void {
    this.colorGrants.push({ permanentId, color, duration, continuous: opts?.continuous });
  }

  /** Additional colors currently granted to a permanent (CardColor values, deduplicated). */
  grantedColors(permanentId: string): string[] {
    const seen = new Set<string>();
    for (const g of this.colorGrants) {
      if (g.permanentId === permanentId) seen.add(g.color);
    }
    return [...seen];
  }

  /**
   * Record a "this Digimon's stacked cards can't be trashed by the opponent's effects" lock on
   * `permanentId` (EX11-070's rule implementation; KB Q5943). Read by `stackTrashLocked`,
   * consulted at the digivolution-card trash sites.
   */
  addStackTrashLock(permanentId: string, duration: EffectDuration, opts?: { continuous?: boolean }): void {
    this.stackTrashLocks.push({ permanentId, duration, continuous: opts?.continuous });
  }

  /** Whether a permanent's stacked cards are currently locked against trashing (by any active lock). */
  stackTrashLocked(permanentId: string): boolean {
    return this.stackTrashLocks.some((l) => l.permanentId === permanentId);
  }

  addStackCardTrashLock(
    instanceId: string,
    ownerSeat: Seat,
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void {
    this.stackCardTrashLocks.push({ instanceId, ownerSeat, duration, continuous: opts?.continuous });
  }

  /** Whether effects are currently forbidden from trashing this exact stacked card. */
  stackCardTrashLocked(instanceId: string): boolean {
    return this.stackCardTrashLocks.some((lock) => lock.instanceId === instanceId);
  }

  /**
   * Record a "invert each ＜Security Attack ±N＞ grant on this permanent" rule (EX6-031; KB
   * Q3751/Q3752). Read by `securityAttackInverted`, consulted at the security-check strike count.
   */
  addSecurityAttackInversion(permanentId: string, duration: EffectDuration, opts?: { continuous?: boolean }): void {
    this.securityAttackInversions.push({ permanentId, duration, continuous: opts?.continuous });
  }

  /** Whether a permanent's ＜Security Attack ±N＞ grants are currently sign-inverted (any active rule). */
  securityAttackInverted(permanentId: string): boolean {
    return this.securityAttackInversions.some((i) => i.permanentId === permanentId);
  }

  /** Drop every continuous rule scoped to a permanent (when it leaves the field). */
  dropPermanent(permanentId: string): void {
    this.restrictions = this.restrictions.filter((r) => r.permanentId !== permanentId);
    this.attackTargetRestrictions = this.attackTargetRestrictions.filter(
      (entry) => entry.attackerPermanentId !== permanentId && entry.targetPermanentId !== permanentId,
    );
    this.canAttackUnsuspendedGrants = this.canAttackUnsuspendedGrants.filter((g) => g.permanentId !== permanentId);
    this.vortexCanAttackPlayersGrants = this.vortexCanAttackPlayersGrants.filter((g) => g.permanentId !== permanentId);
    this.suspendRestrictionSources = this.suspendRestrictionSources.filter((s) => s.permanentId !== permanentId);
    this.digivolveIntoConstraints = this.digivolveIntoConstraints.filter((c) => c.permanentId !== permanentId);
    this.nameTraitGrants = this.nameTraitGrants.filter((g) => g.permanentId !== permanentId);
    this.originalCardInfoOverrides = this.originalCardInfoOverrides.filter((g) => g.permanentId !== permanentId);
    this.keywordGrants = this.keywordGrants.filter((g) => g.permanentId !== permanentId);
    this.linkMaxGrants = this.linkMaxGrants.filter((g) => g.permanentId !== permanentId);
    this.linkCostReductionGrants = this.linkCostReductionGrants.filter((g) => g.permanentId !== permanentId);
    this.kindGrants = this.kindGrants.filter((g) => g.permanentId !== permanentId);
    this.colorGrants = this.colorGrants.filter((g) => g.permanentId !== permanentId);
    this.stackTrashLocks = this.stackTrashLocks.filter((l) => l.permanentId !== permanentId);
    this.securityAttackInversions = this.securityAttackInversions.filter((i) => i.permanentId !== permanentId);
    this.stackEffectConferrals = this.stackEffectConferrals.filter((c) => c.targetPermanentId !== permanentId);
    this.onDeletionAtEndOfAttackProjections = this.onDeletionAtEndOfAttackProjections.filter(
      (p) => p.permanentId !== permanentId,
    );
    // NOTE: customEffectGrants are anchored on the granted card's INSTANCE, not its permanent, and
    // are intentionally NOT dropped here. The grant must outlive the permanent's field-leave so a
    // granted [On Deletion] still fires on the grantee's OWN deletion (the instance is in trash by
    // the deletion window). The grant lapses via `sweep` at its duration boundary.
    // A security disable lives on its attacker; a timing disable on its suppressed target —
    // either lapses once that permanent leaves the field.
    this.securityEffectDisables = this.securityEffectDisables.filter((d) => d.attackerPermanentId !== permanentId);
    this.effectTimingDisables = this.effectTimingDisables.filter((d) => d.permanentId !== permanentId);
  }

  /** Confer a stack card's effects onto its owning permanent. */
  conferStackEffects(
    targetPermanentId: string,
    stackInstanceId: string,
    opts?: {
      continuous?: boolean;
      trigger?: string;
      excludeInherited?: boolean;
      inheritedOnly?: boolean;
      granterInstanceId?: string;
    },
  ): void {
    const exists = this.stackEffectConferrals.some(
      (c) =>
        c.targetPermanentId === targetPermanentId &&
        c.stackInstanceId === stackInstanceId &&
        c.trigger === opts?.trigger &&
        c.inheritedOnly === opts?.inheritedOnly &&
        c.granterInstanceId === opts?.granterInstanceId,
    );
    if (exists) return;
    this.stackEffectConferrals.push({
      targetPermanentId,
      stackInstanceId,
      continuous: opts?.continuous,
      trigger: opts?.trigger,
      excludeInherited: opts?.excludeInherited,
      inheritedOnly: opts?.inheritedOnly,
      granterInstanceId: opts?.granterInstanceId,
    });
  }

  /** Active stack-effect conferrals (GrantStatic grant:"effects"). */
  listStackEffectConferrals(): readonly StackEffectConferral[] {
    return this.stackEffectConferrals;
  }

  /** Offer a permanent's [On Deletion] effects at the end of its own attack (BT16-015). */
  projectOnDeletionAtEndOfAttack(permanentId: string, duration: EffectDuration): void {
    if (this.onDeletionAtEndOfAttackProjections.some((p) => p.permanentId === permanentId)) return;
    this.onDeletionAtEndOfAttackProjections.push({ permanentId, duration, continuous: true });
  }

  /** Permanents currently projecting their [On Deletion] effects into the end-of-attack window. */
  listOnDeletionAtEndOfAttackProjections(): readonly OnDeletionAtEndOfAttackProjection[] {
    return this.onDeletionAtEndOfAttackProjections;
  }

  /**
   * Grant a named custom effect onto a permanent for a duration. Calls without an activation
   * identity are distinct resolved grants and therefore stack. An explicit identity deduplicates
   * only repeated materializations of THAT activation (for example, duplicate entry signals).
   */
  addCustomEffectGrant(
    instanceId: string,
    ownerSeat: Seat,
    token: string,
    duration: EffectDuration,
    opts?: { activationIdentity?: object; isActive?: () => boolean; continuous?: boolean },
  ): void {
    const exists =
      opts?.activationIdentity !== undefined &&
      this.customEffectGrants.some(
        (grant) =>
          grant.instanceId === instanceId &&
          grant.token === token &&
          grant.activationIdentity === opts.activationIdentity,
      );
    if (exists) return;
    this.customEffectGrants.push({
      grantId: this.nextCustomEffectGrantId++,
      instanceId,
      ownerSeat,
      token,
      duration,
      ...opts,
    });
  }

  /** Keep effects granted to a Digimon attached when that Digimon changes its top card. */
  reanchorCustomEffectGrants(priorTopInstanceId: string, newTopInstanceId: string): void {
    for (const grant of this.customEffectGrants) {
      if (grant.instanceId === priorTopInstanceId) grant.instanceId = newTopInstanceId;
    }
  }

  /** Active named custom effect grants (the collector compiles each token to a real Effect). */
  listCustomEffectGrants(): readonly CustomEffectGrant[] {
    return this.customEffectGrants;
  }

  /** Expire all continuous rules whose duration clears at `boundary`. */
  sweep(state: GameState, boundary: DurationBoundary, sweepSeat: Seat): void {
    const ownerOf = (permanentId: string): Seat => ownerSeatOfPermanent(state, permanentId);
    this.restrictions = this.restrictions.filter(
      (r) => !clearsAt(r.duration, boundary, ownerOf(r.permanentId), sweepSeat),
    );
    this.playerRestrictions = this.playerRestrictions.filter(
      (entry) => !clearsAt(entry.duration, boundary, entry.ownerSeat, sweepSeat),
    );
    this.attackTargetRestrictions = this.attackTargetRestrictions.filter(
      (entry) => !clearsAt(entry.duration, boundary, ownerOf(entry.attackerPermanentId), sweepSeat),
    );
    this.canAttackUnsuspendedGrants = this.canAttackUnsuspendedGrants.filter(
      (g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat),
    );
    this.vortexCanAttackPlayersGrants = this.vortexCanAttackPlayersGrants.filter(
      (g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat),
    );
    this.suspendRestrictionSources = this.suspendRestrictionSources.filter(
      (s) => !clearsAt(s.duration, boundary, ownerOf(s.permanentId), sweepSeat),
    );
    this.unsuspendedDigivolveProhibitions = this.unsuspendedDigivolveProhibitions.filter(
      (entry) => !clearsAt(entry.duration, boundary, entry.sourceSeat, sweepSeat),
    );
    this.digivolveIntoConstraints = this.digivolveIntoConstraints.filter(
      (c) => !clearsAt(c.duration, boundary, ownerOf(c.permanentId), sweepSeat),
    );
    this.nameTraitGrants = this.nameTraitGrants.filter(
      (g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat),
    );
    this.originalCardInfoOverrides = this.originalCardInfoOverrides.filter(
      (g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat),
    );
    this.keywordGrants = this.keywordGrants.filter(
      (g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat),
    );
    this.playerKeywordGrants = this.playerKeywordGrants.filter(
      (grant) => !clearsAt(grant.duration, boundary, grant.seat, sweepSeat),
    );
    this.playerCustomEffectGrants = this.playerCustomEffectGrants.filter(
      (grant) => !clearsAt(grant.duration, boundary, grant.ownerSeat, sweepSeat),
    );
    this.linkMaxGrants = this.linkMaxGrants.filter(
      (g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat),
    );
    this.linkCostReductionGrants = this.linkCostReductionGrants.filter(
      (g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat),
    );
    this.kindGrants = this.kindGrants.filter((g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat));
    this.cannotIgnoreDigivolutionFlags = this.cannotIgnoreDigivolutionFlags.filter(
      (f) => !clearsAt(f.duration, boundary, f.seat, sweepSeat),
    );
    this.securityAddRestrictions = this.securityAddRestrictions.filter(
      (entry) => !clearsAt(entry.duration, boundary, entry.granterSeat, sweepSeat),
    );
    this.colorGrants = this.colorGrants.filter(
      (g) => !clearsAt(g.duration, boundary, ownerOf(g.permanentId), sweepSeat),
    );
    this.stackTrashLocks = this.stackTrashLocks.filter(
      (l) => !clearsAt(l.duration, boundary, ownerOf(l.permanentId), sweepSeat),
    );
    this.stackCardTrashLocks = this.stackCardTrashLocks.filter(
      (lock) => !clearsAt(lock.duration, boundary, lock.ownerSeat, sweepSeat),
    );
    this.securityAttackInversions = this.securityAttackInversions.filter(
      (i) => !clearsAt(i.duration, boundary, ownerOf(i.permanentId), sweepSeat),
    );
    // Color waivers are scoped to a card instance (usually the playing card itself);
    // they clear on turn boundaries by their stated duration, owner-agnostic.
    this.colorWaivers = this.colorWaivers.filter((w) => !clearsAt(w.duration, boundary, sweepSeat, sweepSeat));
    this.memoryGainPolicies = this.memoryGainPolicies.filter((p) => !clearsAt(p.duration, boundary, p.seat, sweepSeat));
    this.costReductionBlocks = this.costReductionBlocks.filter(
      (b) => !clearsAt(b.duration, boundary, b.seat, sweepSeat),
    );
    this.playProhibitions = this.playProhibitions.filter(
      (p) => !clearsAt(p.duration, boundary, p.sourceSeat, sweepSeat),
    );
    this.securityEffectDisables = this.securityEffectDisables.filter(
      (d) => !clearsAt(d.duration, boundary, d.attackerSeat ?? ownerOf(d.attackerPermanentId ?? ""), sweepSeat),
    );
    this.effectTimingDisables = this.effectTimingDisables.filter(
      (d) => !clearsAt(d.duration, boundary, ownerOf(d.permanentId), sweepSeat),
    );
    // UntilOpponentTurnEnd is framed from the GRANTER's seat (recorded as `ownerSeat`), so this
    // clears at the end of the granter's opponent's turn (RB1-030). Anchored on the instance, the
    // grant also lingers harmlessly in trash post-deletion until this boundary sweep removes it.
    this.customEffectGrants = this.customEffectGrants.filter(
      (g) => !clearsAt(g.duration, boundary, g.ownerSeat, sweepSeat),
    );
  }

  /**
   * Drop every CONTINUOUS rule (those produced by persistent / static effects), leaving
   * one-shot, duration-scoped rules intact. Called at the start of the engine's
   * continuous-recompute pass so the static effects can be re-derived from a clean slate
   * without double-applying (Comprehensive Rules §15-8-2: persistent effects are
   * constantly re-applied). One-shot rules ("gains ＜Blocker＞ until end of turn") expire
   * only at their own boundary via `sweep`.
   */
  clearContinuous(): void {
    this.restrictions = this.restrictions.filter((r) => !r.continuous);
    this.playerRestrictions = this.playerRestrictions.filter((r) => !r.continuous);
    this.attackTargetRestrictions = this.attackTargetRestrictions.filter((r) => !r.continuous);
    this.canAttackUnsuspendedGrants = this.canAttackUnsuspendedGrants.filter((g) => !g.continuous);
    this.vortexCanAttackPlayersGrants = this.vortexCanAttackPlayersGrants.filter((g) => !g.continuous);
    this.digivolveIntoConstraints = this.digivolveIntoConstraints.filter((c) => !c.continuous);
    this.nameTraitGrants = this.nameTraitGrants.filter((g) => !g.continuous);
    this.originalCardInfoOverrides = this.originalCardInfoOverrides.filter((g) => !g.continuous);
    this.colorWaivers = this.colorWaivers.filter((w) => !w.continuous);
    this.keywordGrants = this.keywordGrants.filter((g) => !g.continuous);
    this.linkMaxGrants = this.linkMaxGrants.filter((g) => !g.continuous);
    this.linkCostReductionGrants = this.linkCostReductionGrants.filter((g) => !g.continuous);
    this.kindGrants = this.kindGrants.filter((g) => !g.continuous);
    this.cannotIgnoreDigivolutionFlags = this.cannotIgnoreDigivolutionFlags.filter((f) => !f.continuous);
    this.colorGrants = this.colorGrants.filter((g) => !g.continuous);
    this.stackTrashLocks = this.stackTrashLocks.filter((l) => !l.continuous);
    this.stackCardTrashLocks = this.stackCardTrashLocks.filter((lock) => !lock.continuous);
    this.securityAttackInversions = this.securityAttackInversions.filter((i) => !i.continuous);
    this.stackEffectConferrals = this.stackEffectConferrals.filter((c) => !c.continuous);
    this.onDeletionAtEndOfAttackProjections = this.onDeletionAtEndOfAttackProjections.filter((p) => !p.continuous);
    this.customEffectGrants = this.customEffectGrants.filter((grant) => !grant.continuous);
    this.memoryGainPolicies = this.memoryGainPolicies.filter((p) => !p.continuous);
    this.costReductionBlocks = this.costReductionBlocks.filter((b) => !b.continuous);
    this.playProhibitions = this.playProhibitions.filter((p) => !p.continuous);
    this.securityEffectDisables = this.securityEffectDisables.filter((d) => !d.continuous);
    this.effectTimingDisables = this.effectTimingDisables.filter((d) => !d.continuous);
    this.dnaLevelOverrides = this.dnaLevelOverrides.filter((entry) => !entry.continuous);
  }

  /** Clear everything (fresh match). */
  reset(): void {
    this.restrictions = [];
    this.playerRestrictions = [];
    this.attackTargetRestrictions = [];
    this.canAttackUnsuspendedGrants = [];
    this.vortexCanAttackPlayersGrants = [];
    this.suspendRestrictionSources = [];
    this.unsuspendedDigivolveProhibitions = [];
    this.digivolveIntoConstraints = [];
    this.nameTraitGrants = [];
    this.originalCardInfoOverrides = [];
    this.colorWaivers = [];
    this.keywordGrants = [];
    this.playerKeywordGrants = [];
    this.playerCustomEffectGrants = [];
    this.linkMaxGrants = [];
    this.linkCostReductionGrants = [];
    this.kindGrants = [];
    this.cannotIgnoreDigivolutionFlags = [];
    this.colorGrants = [];
    this.stackTrashLocks = [];
    this.stackCardTrashLocks = [];
    this.securityAttackInversions = [];
    this.stackEffectConferrals = [];
    this.onDeletionAtEndOfAttackProjections = [];
    this.customEffectGrants = [];
    this.memoryGainPolicies = [];
    this.costReductionBlocks = [];
    this.playProhibitions = [];
    this.securityEffectDisables = [];
    this.effectTimingDisables = [];
    this.dnaLevelOverrides = [];
  }
}

/** Whether a prohibition `mode` covers the requested play/move action. */
function modeMatches(mode: "play" | "move" | "playOrMove", requested: "play" | "move"): boolean {
  return mode === "playOrMove" || mode === requested;
}

/** Does a card definition satisfy a PlayMatch predicate (kind AND optional DP cap)? */
function playMatchesCard(match: PlayMatch, def: CardDefinition): boolean {
  if (def.isToken === true && match.allowTokens !== true) return false;
  if (match.kinds !== undefined && match.kinds.length > 0) {
    if (!match.kinds.some((k) => def.kinds.includes(k as CardKind))) return false;
  }
  if (match.dpAtMost !== undefined && def.dp > match.dpAtMost) return false;
  return true;
}

function ownerSeatOfPermanent(state: GameState, permanentId: string): Seat {
  return findPermanentInState(state, permanentId)?.controllerSeat ?? 0;
}

/** Re-export the matcher so consumers can resolve a permanent's effective name set. */
export function effectiveNames(ledger: ContinuousEffectLedger, permanent: Permanent, printedName: string): string[] {
  const original = ledger.originalCardInfoOverride(permanent.permanentId)?.name ?? printedName;
  return [original.toLowerCase(), ...ledger.grantedNames(permanent.permanentId)];
}

/**
 * A permanent's EFFECTIVE color set: its printed colors UNIONED with every continuously
 * (BaseCardColors then each active color-grant appends, then Distinct; documented behavior).
 * The color-legality consumers read this instead of the printed colors so an "also treated
 * as <color>" grant is observed. `printedColors` are CardColor values (strings).
 */
export function effectiveColors(
  ledger: ContinuousEffectLedger,
  permanentId: string,
  printedColors: readonly string[],
): string[] {
  const original = ledger.originalCardInfoOverride(permanentId)?.colors ?? printedColors;
  const seen = new Set<string>(original);
  for (const color of ledger.grantedColors(permanentId)) seen.add(color);
  return [...seen];
}

/**
 * A permanent's EFFECTIVE card kinds: its printed `CardDefinition.kinds` UNIONED
 * layering (static kinds then each active KindGrant appends). The type-check
 * gates (combat legality, effect filter matching) read this instead of the
 * printed kinds so a "treated as a Digimon" grant (HARD-01) is observed.
 */
export function effectiveKinds(
  ledger: ContinuousEffectLedger,
  permanentId: string,
  printedKinds: readonly CardKind[],
): CardKind[] {
  const seen = new Set<CardKind>(printedKinds);
  for (const k of ledger.grantedKinds(permanentId)) seen.add(k);
  return [...seen];
}

/** A permanent's printed traits unioned with active runtime trait grants. */
export function effectiveTraits(
  ledger: ContinuousEffectLedger,
  permanentId: string,
  printedTraits: readonly string[],
): string[] {
  const byLowercase = new Map<string, string>();
  for (const trait of printedTraits) byLowercase.set(trait.toLowerCase(), trait);
  for (const trait of ledger.grantedTraits(permanentId)) {
    if (!byLowercase.has(trait.toLowerCase())) byLowercase.set(trait.toLowerCase(), trait);
  }
  return [...byLowercase.values()];
}
