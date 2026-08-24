/* What a centre-stage security check shows: the attacking Digimon, the card that
   was revealed opposite it, and the outcome the two of them resolved into. The
   drawing lives in ./SecurityClashView; this module only decides the contents and
   owns the timeline the CSS keyframes are cut to. */

import { getCardDefinition, isDigimon, type Seat } from "@aegis/shared";

export type SecurityClashResolution = "battle" | "effect" | "trashed";
export type SecurityClashSide = "you" | "opp";

/** The attack the check belongs to, remembered from the last `attackDeclared`. */
export interface SecurityClashAttacker {
  seat: Seat;
  cardId: string;
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
}

/**
 * Timeline of the scene, in the order the beats play. The reveal and the outcome
 * beat mirror the reference client (a 233 ms `EnterSecurity` clip, then a 250 ms
 * claw slash plus a 100 ms settle); the hold is longer than the reference's
 * 170 + 300 ms because a web client has to stay readable without a camera cut.
 */
export const SECURITY_CLASH_TIMINGS = {
  attackerEnterMs: 150,
  revealMs: 233,
  holdMs: 1600,
  outcomeMs: 350,
  exitMs: 200,
} as const;

export const SECURITY_CLASH_REVEAL_AT_MS = SECURITY_CLASH_TIMINGS.attackerEnterMs;

export const SECURITY_CLASH_OUTCOME_AT_MS =
  SECURITY_CLASH_TIMINGS.attackerEnterMs + SECURITY_CLASH_TIMINGS.revealMs + SECURITY_CLASH_TIMINGS.holdMs;

export const SECURITY_CLASH_TOTAL_MS =
  SECURITY_CLASH_OUTCOME_AT_MS + SECURITY_CLASH_TIMINGS.outcomeMs + SECURITY_CLASH_TIMINGS.exitMs;

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
}: {
  key: number;
  revealedCardId: string;
  resolution: string;
  /** Seat whose security was checked, i.e. the `securityChecked` seat. */
  defenderSeat: Seat;
  viewerSeat: Seat;
  attacker?: SecurityClashAttacker;
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
