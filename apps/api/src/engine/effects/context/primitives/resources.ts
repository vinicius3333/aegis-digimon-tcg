import type { CardInstance, DisableTiming, EffectDuration, Seat, ZoneRef } from "@aegis/shared";
import type { PlayMatch } from "../../continuous.js";

/**
 * Draw, memory, DP and the restriction/disable ledgers — the verbs that move a
 * player's resources rather than the board.
 */
export interface ResourcePrimitives {
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
  /** Overall timing prohibition, including matching permanents entering later. */
  disableTimingEffectsForPlayer?(
    seat: Seat,
    timings: DisableTiming[],
    duration: EffectDuration,
    matches: (permanentId: string) => boolean,
  ): void;
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
  /** Tell clients that a DP modifier landed even when immunity suppresses its visible value. */
  announceSuppressedDpModifier?(permanentId: string, delta: number): void;
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
}
