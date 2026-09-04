import {
  EffectDuration,
  requireCardDefinition,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { findPermanentInState } from "../state/access.js";

/**
 * Duration-scoped modifier ledger (subsystem: effect-primitives).
 *
 * Some effect verbs apply a change that lasts for a bounded window rather than
 * mutating a single schema field once: a DP buff "until the end of your opponent's
 * turn" (`modifyDP`), a Piercing grant "until end of battle" (`grantPierce`), and a
 * continuous digivolve-cost adjustment (`changeEvoCost`). The synchronized schema
 * (Permanent) stores only the *resolved* value the client renders (`currentDP`); the
 * set of active modifiers that produced it is server-only bookkeeping and lives here.
 *
 * This mirrors the source model precisely: in the documented rules a temporary effect was appended
 * to a per-permanent list keyed by its duration — `Permanent.UntilOpponentTurnEndEffects`,
 * `UntilOwnerTurnEndEffects`, `UntilEachTurnEndEffects`, the battle/attack-scoped lists,
 * etc. (documented behavior) — and `the engine` removed the matching list at each boundary
 * (EndTurnProcess / end-of-battle / unsuspend). `currentDP` is recomputed from `baseDP`
 * plus the live DP modifiers, the analogue of the source stat recompute.
 *
 * Scope of this module (deliberately minimal, matching the `core` effect-primitives
 * subsystem): it OWNS the modifier store, the `currentDP` recompute, and the
 * boundary sweep. It does NOT implement a full continuous-recompute engine that
 * reacts to every state change; the consumers live elsewhere:
 *   - `changeEvoCost` adjustments are recorded here and read by the digivolve
 *     action via `GameEngine.digivolveDeps`'s `adjustedDigivolveCost`, which calls
 *     `evoCostFor`.
 *   - `grantPierce` is recorded here and read by combat via
 *     `GameEngine`'s `hasPierce` hook, consumed in `combat/controller.ts`'s
 *     post-win Piercing step.
 *
 * Pure with respect to game rules: it never advances the game. Everything it mutates
 * is either its own store or the derived `currentDP` mirror of a permanent.
 */

/** A duration-bounded DP delta applied to one permanent. */
export interface DpModifier {
  permanentId: string;
  delta: number;
  duration: EffectDuration;
  /** Card instance whose continued presence sustains this modifier. */
  sourceInstanceId?: string;
  /** Ignore only the canonical opponent-turn end already in progress. */
  skipsCurrentOpponentTurnEnd?: boolean;
  /**
   * True when this delta was produced by a PERSISTENT (static / `EffectTiming.None`)
   * effect rather than a one-shot triggered effect. The continuous-recompute pass
   * (GameEngine.recomputeContinuousEffects) clears every continuous modifier and
   * re-derives them by re-firing the static effects, so it must be able to drop only
   * the continuous tier and leave one-shot, duration-scoped modifiers (a `[When
   * Attacking]` +1000 DP for the turn) untouched. A one-shot modifier expires by its
   * own `duration` boundary, never by the recompute sweep.
   */
  continuous?: boolean;
}

/** A duration-bounded DP delta applied to every current and future Digimon of a player. */
export interface PlayerDpModifier {
  seat: Seat;
  delta: number;
  duration: EffectDuration;
  /** Controller of the effect that owns the duration frame; defaults to the affected seat. */
  ownerSeat?: Seat;
  /** Ignore only the opponent-turn end already in progress. */
  skipsCurrentOpponentTurnEnd?: boolean;
}

/**
 * A duration-bounded ABSOLUTE base-DP override on one permanent (the "treated as
 * having N DP" / "change the original DP to N" family). Unlike a {@link DpModifier},
 * which is a signed delta summed onto the base, an override REPLACES the base DP that
 * deltas then sum onto. When several overrides are active on the same permanent the
 * highest `activatedAt` (most recently applied) wins; KB BT22-007 Q4865.
 */
export interface BaseDpOverride {
  permanentId: string;
  value: number;
  activatedAt: number;
  duration: EffectDuration;
  /** True when produced by a persistent (static) effect — see DpModifier.continuous. */
  continuous?: boolean;
}

/**
 * A duration-bounded "can't have less than N DP" floor on one permanent (EX11-070's
 * delta) it is a CLAMP: the permanent's computed DP (base override + summed deltas) is raised
 * up to the floor AFTER all changes are applied (KB Q5941). Several floors may coexist; the
 * HIGHEST wins. Produced by a persistent (static) effect, so it carries `continuous` and is
 * re-derived each continuous-recompute pass.
 */
export interface MinDpFloor {
  permanentId: string;
  floor: number;
  duration: EffectDuration;
  /** True when produced by a persistent (static) effect — see DpModifier.continuous. */
  continuous?: boolean;
}

/** A duration-bounded Piercing grant on one permanent. */
export interface PierceGrant {
  permanentId: string;
  duration: EffectDuration;
  /** True when produced by a persistent (static) effect — see DpModifier.continuous. */
  continuous?: boolean;
}

/**
 * What a digivolve-cost adjustment's predicate is evaluated against: the BASE
 * permanent being digivolved, plus (when known) the DEFINITION of the card being
 * digivolved INTO. The `into` definition is what lets a "when digivolving INTO this
 * card …" effect (documented behavior `CardSourceCondition: cardSource == card`, e.g. BT7-040 /
 * BT11-059) match only the digivolve that targets it, rather than every digivolve
 * onto a matching base. Base-keyed reductions ("your green Digimon digivolve for 1
 * less", BT7-089) ignore `into`. It is `undefined` at non-cost-query call sites.
 */
export interface EvoCostMatch {
  target: Permanent;
  into?: CardDefinition;
}

/**
 * A continuous digivolve-cost adjustment: while active, any digivolve matching
 * `match` is `delta` less (or `setFixed` to an absolute cost). The predicate is
 * evaluated against live state by whoever consumes the adjustment.
 */
export interface EvoCostAdjustment {
  id: number;
  match: (m: EvoCostMatch) => boolean;
  delta: number;
  setFixed: boolean;
  /** True for "the next time" modifiers; removed when a matching digivolve is applied. */
  once?: boolean;
  /** Side effect to run exactly when a once modifier is consumed by a real cost payment. */
  onConsume?: (match: EvoCostMatch) => void;
  /** True when produced by a persistent (static) effect — see DpModifier.continuous. */
  continuous?: boolean;
  /**
   * Expiry boundary (WR-01 fix). A one-shot triggered activation (a `[Your Turn]`
   * BeforePayCost/WhenDigivolving suspend-to-reduce-cost effect, e.g. RB1-034,
   * BT4-095) has no caller-supplied duration — `changeEvoCost` takes none — so
   * `addEvoCostAdjustment` defaults it to `UntilEachTurnEnd` and `sweep()` expires it
   * at the next turn-end boundary, matching how one-shot `DpModifier`s already expire.
   * A CONTINUOUS adjustment (from the static-recompute pass) instead gets `Permanent`
   * (never boundary-swept) because its lifecycle is owned exclusively by
   * `clearContinuous()`, which re-derives it every recompute pass — see `continuous`.
   */
  duration: EffectDuration;
}

/**
 * A continuous play/use-cost adjustment: while active, the play (or use) cost of any
 * card definition matching `match` is reduced by `delta` (or set to `setFixed`). The
 * `rule implementation` / `MandatorySelfPlayCostReduction` play-cost static forms (the
 * digivolution-cost form lives in EvoCostAdjustment). Keyed by source like EvoCost
 * adjustments; the continuous-recompute pass owns its lifecycle.
 */
export interface PlayCostAdjustment {
  id: number;
  /** Which card definitions (and whose) the adjustment applies to. */
  match: (def: PlayCostFacts) => boolean;
  delta: number;
  setFixed: boolean;
  continuous?: boolean;
  /** Expiry boundary — see {@link EvoCostAdjustment.duration}; same one-shot-vs-continuous split. */
  duration: EffectDuration;
}

/** The card facts a PlayCostAdjustment matcher reads (definition + the controller paying). */
export interface PlayCostFacts {
  def: CardDefinition;
  controllerSeat: Seat;
  permanentId?: string;
}

/**
 * The turn/battle boundaries at which durations expire. The engine's
 * TurnStateMachine `clearDurations(boundary)` hook calls `sweep(state, boundary)`;
 * combat calls it at end-of-battle/attack. Names mirror the source
 * `EffectDuration` windows so the mapping is one-to-one.
 */
export type DurationBoundary =
  | "ownerTurnEnd"
  | "opponentTurnEnd"
  | "eachTurnEnd"
  | "endAttack"
  | "endBattle"
  | "ownerActivePhase"
  | "nextUntap";

/**
 * Which boundary clears a given duration, from the perspective of the turn player
 * whose turn is ENDING (for the turn-end boundaries) — i.e. the seat passed to the
 * sweep is "whose turn just ended / whose active phase began". Mirrors the source
 * branch in the engine where `UntilOwnerTurnEndEffects` clears on the owner's
 * end-turn and `UntilOpponentTurnEndEffects` clears on the opponent's end-turn.
 *
 * `UntilCalculateFixedCost` is a within-cost-window scratch duration in the source;
 * it never survives to a turn boundary, so it is swept conservatively at every
 * turn-end boundary (it should already have been cleared by the cost step).
 */
function clearsAt(
  duration: EffectDuration,
  boundary: DurationBoundary,
  modifierOwnerSeat: Seat,
  sweepSeat: Seat,
): boolean {
  switch (duration) {
    case EffectDuration.UntilOwnerTurnEnd:
      // Clears when the owner's own turn ends.
      return (boundary === "ownerTurnEnd" || boundary === "eachTurnEnd") && modifierOwnerSeat === sweepSeat;
    case EffectDuration.UntilOpponentTurnEnd:
      // Clears when the owner's opponent's turn ends.
      return (
        (boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd" || boundary === "eachTurnEnd") &&
        modifierOwnerSeat !== sweepSeat
      );
    case EffectDuration.UntilEachTurnEnd:
      return boundary === "eachTurnEnd" || boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd";
    case EffectDuration.UntilEndAttack:
      return boundary === "endAttack" || boundary === "endBattle";
    case EffectDuration.UntilEndBattle:
      return boundary === "endBattle";
    case EffectDuration.UntilOwnerActivePhase:
      return boundary === "ownerActivePhase" && modifierOwnerSeat === sweepSeat;
    case EffectDuration.UntilNextUntap:
      return boundary === "nextUntap" && modifierOwnerSeat === sweepSeat;
    case EffectDuration.UntilCalculateFixedCost:
      return boundary === "ownerTurnEnd" || boundary === "opponentTurnEnd" || boundary === "eachTurnEnd";
    case EffectDuration.Permanent:
      // A genuinely-permanent grant is never cleared by any boundary sweep (WR-03 / ENG-02).
      return false;
    default: {
      const exhaustive: never = duration;
      void exhaustive;
      return false;
    }
  }
}

export class ModifierLedger {
  private dpModifiers: DpModifier[] = [];
  private playerDpModifiers: PlayerDpModifier[] = [];
  private baseDpOverrides: BaseDpOverride[] = [];
  private minDpFloors: MinDpFloor[] = [];
  private pierceGrants: PierceGrant[] = [];
  private evoCostAdjustments: EvoCostAdjustment[] = [];
  private playCostAdjustments: PlayCostAdjustment[] = [];
  private baseDpOverrideSeq = 0;
  private evoCostSeq = 0;
  private playCostSeq = 0;
  private continuous?: import("./continuous.js").ContinuousEffectLedger;

  /** Wire the continuous ledger for cost-reduction prohibition checks. */
  bindContinuous(ledger: import("./continuous.js").ContinuousEffectLedger): void {
    this.continuous = ledger;
  }

  /**
   * Record a DP delta on `permanentId` for `duration` and immediately recompute
   * that permanent's `currentDP`. Returns the modifier so a caller could later
   * remove it (e.g. a "remove this effect" trigger), mirroring the source pattern
   * where the rule implementation kept a handle to the effect it added to the list.
   */
  addDpModifier(
    state: GameState,
    permanentId: string,
    delta: number,
    duration: EffectDuration,
    opts?: { continuous?: boolean; sourceInstanceId?: string; skipsCurrentOpponentTurnEnd?: boolean },
  ): DpModifier {
    const modifier: DpModifier = {
      permanentId,
      delta,
      duration,
      continuous: opts?.continuous,
      sourceInstanceId: opts?.sourceInstanceId,
      skipsCurrentOpponentTurnEnd: opts?.skipsCurrentOpponentTurnEnd,
    };
    this.dpModifiers.push(modifier);
    this.recomputeDP(state, permanentId);
    return modifier;
  }

  /** Record a player-wide DP delta and immediately refresh all current affected Digimon. */
  addPlayerDpModifier(
    state: GameState,
    seat: Seat,
    delta: number,
    duration: EffectDuration,
    opts?: { ownerSeat?: Seat; skipsCurrentOpponentTurnEnd?: boolean },
  ): PlayerDpModifier {
    const modifier = {
      seat,
      delta,
      duration,
      ownerSeat: opts?.ownerSeat,
      skipsCurrentOpponentTurnEnd: opts?.skipsCurrentOpponentTurnEnd,
    };
    this.playerDpModifiers.push(modifier);
    for (const permanent of state.players[seat]!.battleArea) this.recomputeDP(state, permanent.permanentId);
    return modifier;
  }

  /** Active DP modifiers on a permanent (server-only; for tests/diagnostics). */
  dpModifiersOf(permanentId: string): readonly DpModifier[] {
    return this.dpModifiers.filter((m) => m.permanentId === permanentId);
  }

  /** Sum of active DP deltas on a permanent. */
  dpDeltaOf(permanentId: string): number {
    let sum = 0;
    for (const m of this.dpModifiers) {
      if (m.permanentId === permanentId) sum += m.delta;
    }
    return sum;
  }

  private playerDpDeltaOf(permanent: Permanent): number {
    let sum = 0;
    for (const modifier of this.playerDpModifiers) {
      if (modifier.seat !== permanent.controllerSeat) continue;
      if (modifier.delta < 0 && this.continuous?.hasRestriction(permanent.permanentId, "dpImmune")) continue;
      sum += modifier.delta;
    }
    return sum;
  }

  /** Remove active DP reductions when an effect makes that Digimon immune to DP reduction. */
  restoreDpReductions(state: GameState, permanentId: string): void {
    this.dpModifiers = this.dpModifiers.filter(
      (modifier) => modifier.permanentId !== permanentId || modifier.delta >= 0,
    );
    this.recomputeDP(state, permanentId);
  }

  /**
   * Record an absolute base-DP override on `permanentId` for `duration` and
   * immediately recompute that permanent's `currentDP`. Each override carries a
   * monotonic `activatedAt` so {@link baseDpOf} can pick the most recently applied
   * one when several coexist (KB BT22-007 Q4865). Returns the override so a caller
   * could later remove it.
   */
  addBaseDpOverride(
    state: GameState,
    permanentId: string,
    value: number,
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): BaseDpOverride {
    const override: BaseDpOverride = {
      permanentId,
      value,
      activatedAt: this.baseDpOverrideSeq++,
      duration,
      continuous: opts?.continuous,
    };
    this.baseDpOverrides.push(override);
    this.recomputeDP(state, permanentId);
    return override;
  }

  /**
   * The base DP a permanent's `currentDP` is computed from: the value of the most
   * recently applied active override, or the permanent's printed `baseDP` when no
   * override is active. Last-applied wins between competing overrides.
   */
  private baseDpOf(permanent: Permanent): number {
    let chosen: BaseDpOverride | undefined;
    for (const o of this.baseDpOverrides) {
      if (o.permanentId !== permanent.permanentId) continue;
      if (chosen === undefined || o.activatedAt > chosen.activatedAt) chosen = o;
    }
    return chosen?.value ?? permanent.baseDP;
  }

  /**
   * Comprehensive Rules §4-2-4: "A Digimon gets the link DP value on its link card." Each
   * card plugged into `permanent.linked` contributes its own printed `linkDp` (extracted onto
   * `CardDefinition.linkDp`, e.g. BT21-009's 2000) as a flat bonus on top of base DP — summed
   * across every link card the permanent currently holds, since a Digimon can hold more than
   * one (`<Link +N>`).
   */
  private linkDpOf(permanent: Permanent): number {
    let sum = 0;
    for (const card of permanent.linked) {
      sum += requireCardDefinition(card.cardId).linkDp ?? 0;
    }
    return sum;
  }

  /** Active base-DP overrides on a permanent (server-only; for tests/diagnostics). */
  baseDpOverridesOf(permanentId: string): readonly BaseDpOverride[] {
    return this.baseDpOverrides.filter((o) => o.permanentId === permanentId);
  }

  /**
   * Record a "can't have less than `floor` DP" clamp on `permanentId` for `duration` and
   * immediately recompute its `currentDP` (EX11-070's inherited rule implementation). The clamp is
   * applied AFTER all +/- changes (KB Q5941), so it must live in the DP-calc layer rather than as
   * a delta. Returns the floor entry so a caller could later remove it.
   */
  addMinDpFloor(
    state: GameState,
    permanentId: string,
    floor: number,
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): MinDpFloor {
    const entry: MinDpFloor = { permanentId, floor, duration, continuous: opts?.continuous };
    this.minDpFloors.push(entry);
    this.recomputeDP(state, permanentId);
    return entry;
  }

  /**
   * The HIGHEST active min-DP floor on a permanent, or `undefined` when none applies. Several
   * floors may coexist (two sources each granting "can't have less than 1000 DP"); the highest
   * binds (a stricter floor never lowers a looser one).
   */
  private minDpFloorOf(permanentId: string): number | undefined {
    let floor: number | undefined;
    for (const f of this.minDpFloors) {
      if (f.permanentId !== permanentId) continue;
      if (floor === undefined || f.floor > floor) floor = f.floor;
    }
    return floor;
  }

  /** Active min-DP floors on a permanent (server-only; for tests/diagnostics). */
  minDpFloorsOf(permanentId: string): readonly MinDpFloor[] {
    return this.minDpFloors.filter((f) => f.permanentId === permanentId);
  }

  /**
   * Recompute and write `currentDP = base + link DP + sum(active DP deltas)` for one
   * permanent, where `base` is the active base-DP override (latest wins) or the
   * permanent's printed `baseDP`, and "link DP" is the sum of every link card's printed
   * `linkDp` (CR §4-2-4, {@link linkDpOf}). Clamps at 0: a Digimon's DP is never negative
   * (source stat reads floor at 0). The KB-mandated order is override-replaces-base,
   * then deltas sum on top (Q4864: 16000-3000=13000; Q1057: 1000-1000=0 → deletion).
   * The engine calls this after `baseDP` changes (e.g. digivolve) too, so a buff that
   * outlives a digivolution stays applied to the new base.
   */
  recomputeDP(state: GameState, permanentId: string): void {
    const permanent = findPermanentInState(state, permanentId);
    if (permanent === undefined) return;
    const next =
      this.baseDpOf(permanent) +
      this.linkDpOf(permanent) +
      this.dpDeltaOf(permanentId) +
      this.playerDpDeltaOf(permanent);
    permanent.currentDP = this.applyDpFloor(permanentId, next);
  }

  /**
   * Apply the active min-DP floor (EX11-070 Q5941) to an after-all-changes DP value, then the
   * base 0-clamp. The floor is applied AFTER deltas are summed, so a Digimon reduced below the
   * floor is raised back to it (5000 +2000 −7000 → 0 → clamped to 1000). With no floor, DP simply
   * floors at 0 (a stat read never shows negative DP). A floor of 1000 supersedes the 0-clamp.
   */
  private applyDpFloor(permanentId: string, computed: number): number {
    const floor = this.minDpFloorOf(permanentId);
    const clamped = floor !== undefined && computed < floor ? floor : computed;
    return clamped < 0 ? 0 : clamped;
  }

  /**
   * The DP a permanent would have (`base + sum(active deltas)`), with the min-DP floor applied
   * but NOT the 0-clamp — it may be negative. `currentDP` floors at 0 (a stat read never shows
   * negative DP), but the state-based-action rule check needs the (floor-adjusted) value to
   * raw value (documented behavior `IsNotHavingDP` / `IsDigimonLackDP`). The EX11-070 floor (Q5941)
   * IS a real DP change that the deletion check observes: a floored Digimon driven below the floor
   * sits AT the floor (≥1000), so it is neither trashed nor deleted. Returns 0 when unknown.
   */
  rawDp(state: GameState, permanentId: string): number {
    const permanent = findPermanentInState(state, permanentId);
    if (permanent === undefined) return 0;
    const computed =
      this.baseDpOf(permanent) +
      this.linkDpOf(permanent) +
      this.dpDeltaOf(permanentId) +
      this.playerDpDeltaOf(permanent);
    const floor = this.minDpFloorOf(permanentId);
    return floor !== undefined && computed < floor ? floor : computed;
  }

  /** Grant Piercing to a permanent for a duration (read by combat at battle outcome). */
  addPierceGrant(permanentId: string, duration: EffectDuration, opts?: { continuous?: boolean }): PierceGrant {
    const grant: PierceGrant = { permanentId, duration, continuous: opts?.continuous };
    this.pierceGrants.push(grant);
    return grant;
  }

  /**
   * Whether a permanent currently has Piercing from any active grant. Consumed by
   * resolveDigimonBattle (combat/controller.ts): a winning piercing attacker that
   * deleted the defending Digimon performs the defending player's security check.
   */
  hasPierce(permanentId: string): boolean {
    return this.pierceGrants.some((g) => g.permanentId === permanentId);
  }

  /**
   * Record a digivolve-cost adjustment. Returns its id for removal. A CONTINUOUS
   * adjustment (`opts.continuous`, from the static-recompute pass) never expires by
   * boundary sweep — only `clearContinuous()` removes it. A one-shot adjustment (a
   * triggered `[Your Turn]`/`[When Digivolving]` suspend-to-reduce activation) has no
   * caller-supplied duration, so it defaults to `UntilEachTurnEnd`: it survives long
   * enough for the digivolve it was granted for (which resolves synchronously in the
   * same effect run) but does not become a permanent global reduction that stacks
   * across activations (WR-01).
   */
  addEvoCostAdjustment(
    match: (m: EvoCostMatch) => boolean,
    delta: number,
    setFixed: boolean,
    opts?: { continuous?: boolean; once?: boolean; onConsume?: (match: EvoCostMatch) => void },
  ): EvoCostAdjustment {
    const adjustment: EvoCostAdjustment = {
      id: this.evoCostSeq++,
      match,
      delta,
      setFixed,
      once: opts?.once,
      onConsume: opts?.onConsume,
      continuous: opts?.continuous,
      duration: opts?.continuous ? EffectDuration.Permanent : EffectDuration.UntilEachTurnEnd,
    };
    this.evoCostAdjustments.push(adjustment);
    return adjustment;
  }

  /**
   * Record a play/use-cost adjustment ("reduce the play cost of your Digimon by N",
   * "increase the cost of your opponent's next Digimon by N"). Returns its id for
   * removal. Consumed by `playCostFor` in the play-card / option-use cost calculation.
   * Duration defaults the same way as {@link addEvoCostAdjustment}: `Permanent` when
   * continuous (owned by `clearContinuous()`), else `UntilEachTurnEnd` so a one-shot
   * activation (EX5-043's `[When Digivolving]`/`[Main]` play-cost reduction) does not
   * outlive the turn it was granted on (WR-01).
   */
  addPlayCostAdjustment(
    match: (def: PlayCostFacts) => boolean,
    delta: number,
    setFixed: boolean,
    opts?: { continuous?: boolean },
  ): PlayCostAdjustment {
    const adjustment: PlayCostAdjustment = {
      id: this.playCostSeq++,
      match,
      delta,
      setFixed,
      continuous: opts?.continuous,
      duration: opts?.continuous ? EffectDuration.Permanent : EffectDuration.UntilEachTurnEnd,
    };
    this.playCostAdjustments.push(adjustment);
    return adjustment;
  }

  /**
   * The play/use cost for a card definition after all active adjustments, given the
   * printed `base` cost. A `setFixed` adjustment REPLACES the base cost (last one set
   * wins); additive deltas then apply ON TOP of the set base (KB BT7-040 Q1568: the
   * SET value is computed first, then other reduction effects subtract from it). With
   * no `setFixed` the deltas apply to the printed base. Never returns below 0 (a cost
   * can't be reduced past zero — Official Rule Manual). Returns `base` unchanged when
   * nothing matches.
   */
  playCostFor(facts: PlayCostFacts, base: number): number {
    let delta = 0;
    let fixed: number | undefined;
    let matched = false;
    for (const a of this.playCostAdjustments) {
      if (!a.match(facts)) continue;
      matched = true;
      if (a.setFixed) fixed = a.delta;
      else delta += a.delta;
    }
    if (!matched) return base;
    if (this.continuous?.blocksCostReduction(facts.controllerSeat, "play")) {
      if (delta < 0) delta = 0;
      if (fixed !== undefined && fixed < base) fixed = base;
    }
    const next = (fixed !== undefined ? fixed : base) + delta;
    return next < 0 ? 0 : next;
  }

  /** Remove a previously recorded play-cost adjustment by id (when its source leaves play). */
  removePlayCostAdjustment(id: number): void {
    this.playCostAdjustments = this.playCostAdjustments.filter((a) => a.id !== id);
  }

  /**
   * The net digivolve-cost adjustment for `target` from all active adjustments: a
   * `setFixed` adjustment REPLACES the base cost (last one set wins) and any additive
   * deltas then apply ON TOP of it (KB BT7-040 Q1568: the SET value is computed first,
   * then other reduction effects subtract from it), so the folded absolute cost is
   * returned as `{ fixed }`. With no `setFixed` the deltas sum into `{ delta }`.
   * Returns undefined when nothing matches.
   *
   * `into` is the definition of the card being digivolved INTO; it lets a "when
   * digivolving INTO this card" adjustment match only its own digivolve (BT7-040 /
   * BT11-059). When omitted, only base-keyed adjustments can match.
   */
  evoCostFor(
    target: Permanent,
    into?: CardDefinition,
    opts?: { consumeOnce?: boolean },
  ): { delta: number } | { fixed: number } | undefined {
    const m: EvoCostMatch = { target, into };
    let delta = 0;
    let fixed: number | undefined;
    let matched = false;
    const consumeIds: number[] = [];
    const consumeCallbacks: ((match: EvoCostMatch) => void)[] = [];
    for (const a of this.evoCostAdjustments) {
      if (!a.match(m)) continue;
      matched = true;
      if (opts?.consumeOnce === true && a.once === true) {
        consumeIds.push(a.id);
        if (a.onConsume !== undefined) consumeCallbacks.push(a.onConsume);
      }
      if (a.setFixed) {
        fixed = a.delta;
      } else {
        delta += a.delta;
      }
    }
    if (!matched) return undefined;
    if (consumeIds.length > 0) {
      const consumed = new Set(consumeIds);
      this.evoCostAdjustments = this.evoCostAdjustments.filter((a) => !consumed.has(a.id));
      for (const cb of consumeCallbacks) cb(m);
    }
    const ownerSeat = target.controllerSeat;
    if (this.continuous?.blocksCostReduction(ownerSeat, "digivolve") && delta < 0) {
      delta = 0;
    }
    if (fixed !== undefined) {
      const folded = fixed + delta;
      return { fixed: folded < 0 ? 0 : folded };
    }
    return { delta };
  }

  /** Remove a previously recorded evo-cost adjustment by id (when its source leaves play). */
  removeEvoCostAdjustment(id: number): void {
    this.evoCostAdjustments = this.evoCostAdjustments.filter((a) => a.id !== id);
  }

  /**
   * Drop every modifier scoped to permanent `permanentId` (e.g. when it leaves the
   * field). DP modifiers and pierce grants keyed to a gone permanent are dead; this
   * keeps the ledger from leaking. Evo-cost adjustments are keyed to their SOURCE,
   * not a target permanent, so they are not cleared here (their source removes them).
   */
  dropPermanent(permanentId: string): void {
    this.dpModifiers = this.dpModifiers.filter((m) => m.permanentId !== permanentId);
    this.baseDpOverrides = this.baseDpOverrides.filter((o) => o.permanentId !== permanentId);
    this.minDpFloors = this.minDpFloors.filter((f) => f.permanentId !== permanentId);
    this.pierceGrants = this.pierceGrants.filter((g) => g.permanentId !== permanentId);
  }

  /** Remove DP modifiers sustained by card instances that have left their source stack. */
  dropSourceInstances(state: GameState, instanceIds: readonly string[]): void {
    const removed = new Set(instanceIds);
    const touched = new Set<string>();
    this.dpModifiers = this.dpModifiers.filter((modifier) => {
      if (modifier.sourceInstanceId === undefined || !removed.has(modifier.sourceInstanceId)) return true;
      touched.add(modifier.permanentId);
      return false;
    });
    for (const permanentId of touched) this.recomputeDP(state, permanentId);
  }

  /**
   * Expire all modifiers whose duration clears at `boundary` and recompute the DP of
   * every permanent that lost a modifier. `sweepSeat` is the seat the boundary is
   * relative to (whose turn ended / whose active phase began). Mirrors the source
   * the engine duration-list clearing at each timing window.
   */
  sweep(state: GameState, boundary: DurationBoundary, sweepSeat: Seat): void {
    const touched = new Set<string>();

    this.playerDpModifiers = this.playerDpModifiers.filter((modifier) => {
      const ownerSeat = modifier.ownerSeat ?? modifier.seat;
      if (modifier.skipsCurrentOpponentTurnEnd === true) {
        if (boundary === "opponentTurnEnd" && ownerSeat !== sweepSeat) {
          modifier.skipsCurrentOpponentTurnEnd = false;
        }
        return true;
      }
      const expires = clearsAt(modifier.duration, boundary, ownerSeat, sweepSeat);
      if (expires) {
        for (const permanent of state.players[modifier.seat]!.battleArea) touched.add(permanent.permanentId);
      }
      return !expires;
    });

    this.dpModifiers = this.dpModifiers.filter((m) => {
      const ownerSeat = ownerSeatOfPermanent(state, m.permanentId);
      if (m.skipsCurrentOpponentTurnEnd === true) {
        if (boundary === "opponentTurnEnd" && ownerSeat !== sweepSeat) m.skipsCurrentOpponentTurnEnd = false;
        return true;
      }
      const expires = clearsAt(m.duration, boundary, ownerSeat, sweepSeat);
      if (expires) touched.add(m.permanentId);
      return !expires;
    });

    this.baseDpOverrides = this.baseDpOverrides.filter((o) => {
      const ownerSeat = ownerSeatOfPermanent(state, o.permanentId);
      const expires = clearsAt(o.duration, boundary, ownerSeat, sweepSeat);
      if (expires) touched.add(o.permanentId);
      return !expires;
    });

    this.minDpFloors = this.minDpFloors.filter((f) => {
      const ownerSeat = ownerSeatOfPermanent(state, f.permanentId);
      const expires = clearsAt(f.duration, boundary, ownerSeat, sweepSeat);
      if (expires) touched.add(f.permanentId);
      return !expires;
    });

    this.pierceGrants = this.pierceGrants.filter((g) => {
      const ownerSeat = ownerSeatOfPermanent(state, g.permanentId);
      return !clearsAt(g.duration, boundary, ownerSeat, sweepSeat);
    });

    // Evo-cost/play-cost adjustments are keyed to their SOURCE (a predicate closure),
    // not a permanent, so there is no owner seat to derive — pass 0 as a harmless
    // placeholder. It is never actually consulted: the only durations these ever carry
    // are `Permanent` (seat-independent — never clears) and `UntilEachTurnEnd` (also
    // seat-independent per `clearsAt`), so the placeholder cannot affect the outcome.
    this.evoCostAdjustments = this.evoCostAdjustments.filter(
      (a) => !clearsAt(a.duration, boundary, 0 as Seat, sweepSeat),
    );
    this.playCostAdjustments = this.playCostAdjustments.filter(
      (a) => !clearsAt(a.duration, boundary, 0 as Seat, sweepSeat),
    );

    for (const permanentId of touched) {
      this.recomputeDP(state, permanentId);
    }
  }

  /**
   * Drop every CONTINUOUS modifier (those produced by persistent / static effects)
   * and recompute the DP of each permanent that lost one. Called at the start of the
   * engine's continuous-recompute pass (GameEngine.recomputeContinuousEffects) so the
   * static effects can be re-fired from a clean slate without double-applying. One-shot,
   * duration-scoped modifiers (a `[When Attacking]` buff) are kept — they expire only
   * at their own duration boundary via `sweep`.
   */
  clearContinuous(state: GameState): void {
    const touched = new Set<string>();
    this.dpModifiers = this.dpModifiers.filter((m) => {
      if (m.continuous) {
        touched.add(m.permanentId);
        return false;
      }
      return true;
    });
    this.baseDpOverrides = this.baseDpOverrides.filter((o) => {
      if (o.continuous) {
        touched.add(o.permanentId);
        return false;
      }
      return true;
    });
    this.minDpFloors = this.minDpFloors.filter((f) => {
      if (f.continuous) {
        touched.add(f.permanentId);
        return false;
      }
      return true;
    });
    this.pierceGrants = this.pierceGrants.filter((g) => !g.continuous);
    this.evoCostAdjustments = this.evoCostAdjustments.filter((a) => !a.continuous);
    this.playCostAdjustments = this.playCostAdjustments.filter((a) => !a.continuous);
    for (const permanentId of touched) this.recomputeDP(state, permanentId);
  }

  /** Clear everything (e.g. a fresh match). */
  reset(): void {
    this.dpModifiers = [];
    this.playerDpModifiers = [];
    this.baseDpOverrides = [];
    this.minDpFloors = [];
    this.pierceGrants = [];
    this.evoCostAdjustments = [];
    this.playCostAdjustments = [];
    this.baseDpOverrideSeq = 0;
    this.evoCostSeq = 0;
    this.playCostSeq = 0;
  }
}

/**
 * The controller seat of a permanent, or 0 as a harmless default when the permanent
 * is gone (a modifier keyed to a removed permanent expires on any owner-scoped sweep
 * anyway and is also dropped by `dropPermanent`).
 */
function ownerSeatOfPermanent(state: GameState, permanentId: string): Seat {
  const permanent = findPermanentInState(state, permanentId);
  return permanent?.controllerSeat ?? 0;
}
