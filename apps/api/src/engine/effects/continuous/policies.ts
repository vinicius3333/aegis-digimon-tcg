import { EffectDuration, type Seat, type ZoneRef } from "@aegis/shared";

/**
 * The ledger's remaining entry shapes: projected [On Deletion] windows, custom
 * effect grants, the play / security / timing disables, and the memory and cost
 * policies a seat can be put under.
 */

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
  /** Seat the duration sweep is framed from (the granter, which may differ from the recipient). */
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

export interface MemoryGainPolicy {
  /** Seat whose memory gain is restricted. */
  seat: Seat;
  exceptTamerEffects: true;
  duration: EffectDuration;
  continuous?: boolean;
}

export interface CostReductionBlock {
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
export interface PlayProhibition {
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
export interface SecurityEffectDisable {
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
export interface EffectTimingDisable {
  /** The permanent whose timing effects are suppressed. */
  permanentId: string;
  /** Which timing windows are masked. */
  timings: DisableTimingMask[];
  duration: EffectDuration;
  continuous?: boolean;
}

export interface PlayerEffectTimingDisable {
  seat: Seat;
  ownerSeat: Seat;
  timings: DisableTimingMask[];
  duration: EffectDuration;
  matches: (permanentId: string) => boolean;
  continuous?: boolean;
}

export interface DnaLevelOverride {
  permanentId: string;
  level: number;
  intoNames?: string[];
  continuous?: boolean;
}
