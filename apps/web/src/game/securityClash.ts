/* What a centre-stage security check shows: the attacking Digimon, the card that
   was revealed opposite it, and the outcome the two of them resolved into. The
   drawing lives in ./SecurityClashView; this module only decides the contents and
   owns the timeline the CSS keyframes are cut to. */

import { getCardDefinition, isDigimon, type SecurityBattleResult, type Seat } from "@aegis/shared";
import {
  CLASH_OUTCOME_AT_MS,
  CLASH_REVEAL_AT_MS,
  CLASH_TOTAL_MS,
  SECURITY_BRANCH_TOTAL_MS as BRANCH_TOTAL_MS,
  SECURITY_BREAK_TOTAL_MS as BREAK_TOTAL_MS,
  TIMINGS,
} from "./timings";

export type SecurityClashResolution = "battle" | "effect" | "trashed";
export type SecurityClashSide = "you" | "opp";

/** The attack the check belongs to, remembered from the last `attackDeclared`. */
export interface SecurityClashAttacker {
  seat: Seat;
  cardId: string;
  /** The attacker's board identity, so a deletion naming it can be recognized. */
  permanentId?: string;
  /** Its top card's instance id: an effect deletion names instances, not permanents. */
  topInstanceId?: string;
}

export interface SecurityClashFighter {
  cardId: string;
  side: SecurityClashSide;
  /** Only Digimon carry a comparable DP; anything else omits the number. */
  dp?: number;
}

export interface SecurityClashScene {
  /** Increments per check so a new scene restarts the animations instead of resuming them. */
  key: number;
  resolution: SecurityClashResolution;
  revealed: SecurityClashFighter;
  /** Absent for effect-driven checks, which have no attacker to face. */
  attacker?: SecurityClashFighter;
  /**
   * Who lost the DP compare, straight from the server's `securityChecked.battle`.
   * Both directions are named, and a tie names both — nothing here compares DP, and
   * nothing is inferred from the deletions that follow. Absent when no compare
   * happened (any non-battle resolution, or an attacker that left play first).
   *
   * A losing Security Digimon still only ever goes to the trash: CR 14-2-3 keeps the
   * loose card alive whatever the compare said and CR 13-1-8-4 trashes it either way,
   * so `revealed` here drives the claw, not the card's destination.
   */
  loser?: { attacker: boolean; revealed: boolean };
}

/**
 * Timeline of the scene, in the order the beats play. The reveal and the outcome
 * beat mirror the reference client (a 233 ms `EnterSecurity` clip, then a 250 ms
 * claw slash plus a 100 ms settle); the hold is still longer than the reference's
 * 170 + 300 ms because a web client has to stay readable without a camera cut.
 */
export const SECURITY_CLASH_TIMINGS = {
  attackerEnterMs: TIMINGS.clashAttackerEnter,
  revealMs: TIMINGS.clashReveal,
  holdMs: TIMINGS.clashHold,
  outcomeMs: TIMINGS.clashOutcome,
  exitMs: TIMINGS.clashExit,
} as const;

export const SECURITY_CLASH_REVEAL_AT_MS = CLASH_REVEAL_AT_MS;

export const SECURITY_CLASH_OUTCOME_AT_MS = CLASH_OUTCOME_AT_MS;

export const SECURITY_CLASH_TOTAL_MS = CLASH_TOTAL_MS;

/**
 * The beat before the reveal: the defender's shield arms, its glass shatters, and the
 * board holds while the shards clear (battle-animation-spec.md §4b steps 1–5, whose
 * 60 + 170 + 100 ms of held frames are one shorter `securityBreakHold` here — see the
 * note on it in ./timings).
 */
export const SECURITY_BREAK_TIMINGS = {
  armMs: TIMINGS.securityArm,
  breakMs: TIMINGS.shieldBreak,
  holdMs: TIMINGS.securityBreakHold,
} as const;

export const SECURITY_BREAK_TOTAL_MS = BREAK_TOTAL_MS;

/** The shatter starts once the shield has armed. */
export const SECURITY_BREAK_AT_MS = SECURITY_BREAK_TIMINGS.armMs;

/**
 * The beat after the reveal, for a card that resolves an effect (§4b step 10b): the
 * revealed card slides to the half of the screen the side panels do not occupy, holds
 * while its effect notice reads, and leaves for the trash or the field.
 */
export const SECURITY_BRANCH_TIMINGS = {
  inMs: TIMINGS.securityBranchIn,
  holdMs: TIMINGS.securityBranchHold,
  outMs: TIMINGS.securityBranchOut,
} as const;

export const SECURITY_BRANCH_TOTAL_MS = BRANCH_TOTAL_MS;

/** Which shield breaks, and on whose edge of the screen the flash washes in. */
export interface SecurityBreakScene {
  key: number;
  /** The checked player's seat, which is the shield that shatters. */
  seat: Seat;
  side: SecurityClashSide;
}

/** The revealed card, held on its own side of the screen while its effect resolves. */
export interface SecurityBranchScene {
  key: number;
  cardId: string;
  side: SecurityClashSide;
}

export function buildSecurityBreakScene({
  key,
  defenderSeat,
  viewerSeat,
}: {
  key: number;
  defenderSeat: Seat;
  viewerSeat: Seat;
}): SecurityBreakScene {
  return { key, seat: defenderSeat, side: defenderSeat === viewerSeat ? "you" : "opp" };
}

/**
 * The branch scene a check earns, or null when it earns none: only a security card that
 * resolves an effect detours through the side of the screen, and only then does the
 * effect notice have something to sit next to.
 */
export function buildSecurityBranchScene({
  key,
  revealedCardId,
  resolution,
  defenderSeat,
  viewerSeat,
}: {
  key: number;
  revealedCardId: string;
  resolution: string;
  defenderSeat: Seat;
  viewerSeat: Seat;
}): SecurityBranchScene | null {
  if (normalizeSecurityClashResolution(resolution) !== "effect") return null;
  return { key, cardId: revealedCardId, side: defenderSeat === viewerSeat ? "you" : "opp" };
}

const RESOLUTIONS: readonly string[] = ["battle", "effect", "trashed"];

export function normalizeSecurityClashResolution(resolution: string): SecurityClashResolution {
  return RESOLUTIONS.includes(resolution) ? (resolution as SecurityClashResolution) : "trashed";
}

function comparableDp(cardId: string): number | undefined {
  const definition = getCardDefinition(cardId);
  return definition && isDigimon(definition) ? definition.dp : undefined;
}

export function buildSecurityClashScene({
  key,
  revealedCardId,
  resolution,
  defenderSeat,
  viewerSeat,
  attacker,
  battle,
}: {
  key: number;
  revealedCardId: string;
  resolution: string;
  /** Seat whose security was checked, i.e. the `securityChecked` seat. */
  defenderSeat: Seat;
  viewerSeat: Seat;
  attacker?: SecurityClashAttacker;
  /** The DP compare the server published on `securityChecked`. */
  battle?: SecurityBattleResult;
}): SecurityClashScene {
  const defenderSide: SecurityClashSide = defenderSeat === viewerSeat ? "you" : "opp";
  const attackerSide: SecurityClashSide = defenderSide === "you" ? "opp" : "you";
  // An attack context left over from the other seat's attack would face the wrong
  // way, so it is only used when it actually opposes the checked player.
  const facing = attacker && attacker.seat !== defenderSeat ? attacker : undefined;
  return {
    key,
    resolution: normalizeSecurityClashResolution(resolution),
    revealed: { cardId: revealedCardId, side: defenderSide, dp: comparableDp(revealedCardId) },
    ...(facing ? { attacker: { cardId: facing.cardId, side: attackerSide, dp: comparableDp(facing.cardId) } } : {}),
    // Without an attacker on stage there is no side to claw, so the verdict is dropped
    // rather than shown against a card that is not there.
    ...(facing && battle
      ? { loser: { attacker: battle.attackerDeleted, revealed: battle.securityDigimonDeleted } }
      : {}),
  };
}

/**
 * Top-to-bottom order of the two cards: each sits on its own half of the board,
 * so the viewer's attacker always comes from below and the opponent's from above.
 */
export function orderSecurityClashFighters(
  scene: SecurityClashScene,
): readonly { role: "attacker" | "revealed"; fighter: SecurityClashFighter }[] {
  const revealed = { role: "revealed", fighter: scene.revealed } as const;
  if (!scene.attacker) return [revealed];
  const attacker = { role: "attacker", fighter: scene.attacker } as const;
  return scene.attacker.side === "opp" ? [attacker, revealed] : [revealed, attacker];
}
