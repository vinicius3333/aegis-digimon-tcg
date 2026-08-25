/* Every duration the match screen animates to, in one table. TypeScript reads
   the numbers directly; CSS reads them as custom properties set on the battle
   root (see `BATTLE_TIMING_STYLE`), so a keyframe and the timeout that unmounts
   its element can never drift apart.

   Each `var(--t-*)` in game.css carries the same number as its literal fallback,
   because overlays portalled to `document.body` sit outside the battle root and
   would otherwise animate with no duration at all. `timings.test.ts` fails if a
   fallback stops matching the table. */

import type { CSSProperties } from "react";

export const TIMINGS = {
  /** Card back flying from a deck pile to the hand that just grew. */
  drawFlight: 340,
  /** The drawn card dropping into its hand slot. */
  handDraw: 120,
  /** A card arriving in the battle area. */
  cardEnter: 320,
  /** The stars that pop over a card that just landed. */
  cardSparkle: 900,
  /** The memory marker landing on its new chip. */
  memoryMarkerPop: 300,
  /** Each chip the memory value travelled across lighting up. */
  memorySweep: 120,
  /** The attack arrow drawing itself from attacker to target. */
  attackArrow: 380,
  /** The attacker leaning at the security stack it declared on. */
  attackLunge: 300,
  /** How long the attack call-out stays up. */
  attackAnnounce: 1200,
  /** The call-out fading in. */
  attackAnnounceIn: 140,
  /** The security shield flashing when a card is actually checked. */
  securityHit: 350,
  /** Centre-stage security check: the attacker sliding in to face the reveal. */
  clashAttackerEnter: 150,
  /** The revealed security card growing into place. */
  clashReveal: 233,
  /** How long the two cards stay readable before they resolve. */
  clashHold: 1600,
  /** The outcome beat: impact, glow or fall. */
  clashOutcome: 350,
  /** The scene fading back out. */
  clashExit: 200,
  /** The full-width turn banner. */
  turnBanner: 1000,
  /** How long a framed notice stays readable on its own. */
  noticeLifetime: 2800,
  /** A crowded notice stack disperses on this shorter clock instead. */
  noticeCrowdedLifetime: 1400,
  /** A notice sliding in from its anchor. */
  noticeIn: 200,
  /** How long a side panel stays readable on its own. */
  sidePanelLifetime: 5000,
  /** A side panel sharing its column with another erodes on this clock instead. */
  sidePanelCrowdedLifetime: 2600,
  /** Cards moved within this window join the panel already open. */
  sidePanelMergeWindow: 1500,
  /** A side panel opening. */
  sidePanelIn: 230,
  /** A match dialog opening. */
  dialogIn: 180,
  /** The board-mode decision rail sliding in from the left edge. */
  boardPromptIn: 200,
  /** Hover intent before an opponent permanent opens its inspector. */
  inspectorOpen: 320,
  /** Grace period before the inspector closes again. */
  inspectorClose: 160,
} as const;

export type TimingName = keyof typeof TIMINGS;

/** The revealed card enters once the attacker has taken its place. */
export const CLASH_REVEAL_AT_MS = TIMINGS.clashAttackerEnter;

/** The outcome beat starts when the hold is over. */
export const CLASH_OUTCOME_AT_MS = CLASH_REVEAL_AT_MS + TIMINGS.clashReveal + TIMINGS.clashHold;

/** End to end, which is also how long the scene stays mounted. */
export const CLASH_TOTAL_MS = CLASH_OUTCOME_AT_MS + TIMINGS.clashOutcome + TIMINGS.clashExit;

/** The custom properties game.css reads, and the milliseconds behind each one. */
export const BATTLE_TIMING_VARIABLES: Readonly<Record<string, number>> = {
  "--t-draw-flight": TIMINGS.drawFlight,
  "--t-hand-draw": TIMINGS.handDraw,
  "--t-card-enter": TIMINGS.cardEnter,
  "--t-card-sparkle": TIMINGS.cardSparkle,
  "--t-memory-marker-pop": TIMINGS.memoryMarkerPop,
  "--t-memory-sweep": TIMINGS.memorySweep,
  "--t-attack-arrow": TIMINGS.attackArrow,
  "--t-attack-lunge": TIMINGS.attackLunge,
  "--t-attack-announce-in": TIMINGS.attackAnnounceIn,
  "--t-security-hit": TIMINGS.securityHit,
  "--t-clash-enter": TIMINGS.clashAttackerEnter,
  "--t-clash-reveal": TIMINGS.clashReveal,
  "--t-clash-outcome": TIMINGS.clashOutcome,
  "--t-clash-outcome-at": CLASH_OUTCOME_AT_MS,
  "--t-clash-total": CLASH_TOTAL_MS,
  "--t-turn-banner": TIMINGS.turnBanner,
  "--t-side-panel-in": TIMINGS.sidePanelIn,
  "--t-notice-in": TIMINGS.noticeIn,
  "--t-dialog-in": TIMINGS.dialogIn,
  "--t-board-prompt-in": TIMINGS.boardPromptIn,
};

/**
 * Spread onto the battle root so every keyframe below it reads its duration from
 * this table.
 */
export const BATTLE_TIMING_STYLE: CSSProperties = Object.fromEntries(
  Object.entries(BATTLE_TIMING_VARIABLES).map(([name, ms]) => [name, `${ms}ms`]),
) as CSSProperties;
