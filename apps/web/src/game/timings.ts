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
  /** The red arc tracing from the chip memory left to the one it landed on. */
  memoryArc: 520,
  /** One breath of the yellow glow under the chip memory currently sits on. */
  memoryGlow: 1600,
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
  /** The defender's shield arming — the blue glass the reference client switches to. */
  securityArm: 220,
  /** The glass pane shattering (the reference client's `SecurityBreakGlass`, 250 ms). */
  shieldBreak: 250,
  /** The light that washes in from the defender's edge of the screen as the shield breaks. */
  shieldFlash: 320,
  /** The reference client's 60 + 170 + 100 ms of held frames between break and reveal. */
  securityBreakHold: 330,
  /** The revealed security card sliding out to its own side of the screen. */
  securityBranchIn: 220,
  /** How long the revealed card holds there while its effect notice reads. */
  securityBranchHold: 1500,
  /** The card leaving for the trash or the field. */
  securityBranchOut: 220,
  /** The security counter popping as it decrements. */
  securityCountPop: 300,
  /** One permanent's 90° suspend or unsuspend rotation. */
  suspendRotate: 200,
  /** Delay added per board slot so an unsuspend phase sweeps rather than snaps. */
  suspendStagger: 60,
  /** One lap of the stars orbiting a permanent that cannot attack yet. */
  summoningOrbit: 4200,
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
  /** The centre-screen card growing in on a zone change. */
  showcaseIn: 160,
  /** How long the announced card is held centre-screen before the board takes over. */
  showcaseHold: 900,
  /** The centre-screen card clearing out of the way. */
  showcaseOut: 160,
  /** The colour-keyed rays and rings behind a card that just landed. */
  cardBurst: 800,
  /** The starburst at the hand slot where a turn-start draw lands. */
  drawBurst: 600,
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

/** Shield break, end to end: the arm, the shatter, and the held frames after it. */
export const SECURITY_BREAK_TOTAL_MS = TIMINGS.securityArm + TIMINGS.shieldBreak + TIMINGS.securityBreakHold;

/** The security-effect branch, end to end: the slide out, the hold, and the exit. */
export const SECURITY_BRANCH_TOTAL_MS =
  TIMINGS.securityBranchIn + TIMINGS.securityBranchHold + TIMINGS.securityBranchOut;

/** The centre-screen showcase, end to end: how long it stays mounted. */
export const SHOWCASE_TOTAL_MS = TIMINGS.showcaseIn + TIMINGS.showcaseHold + TIMINGS.showcaseOut;

/** When the showcase starts clearing out, which is also when the field may reveal. */
export const SHOWCASE_OUT_AT_MS = TIMINGS.showcaseIn + TIMINGS.showcaseHold;

/** The custom properties game.css reads, and the milliseconds behind each one. */
export const BATTLE_TIMING_VARIABLES: Readonly<Record<string, number>> = {
  "--t-draw-flight": TIMINGS.drawFlight,
  "--t-hand-draw": TIMINGS.handDraw,
  "--t-card-enter": TIMINGS.cardEnter,
  "--t-card-sparkle": TIMINGS.cardSparkle,
  "--t-memory-marker-pop": TIMINGS.memoryMarkerPop,
  "--t-memory-sweep": TIMINGS.memorySweep,
  "--t-memory-arc": TIMINGS.memoryArc,
  "--t-memory-glow": TIMINGS.memoryGlow,
  "--t-attack-arrow": TIMINGS.attackArrow,
  "--t-attack-lunge": TIMINGS.attackLunge,
  "--t-attack-announce-in": TIMINGS.attackAnnounceIn,
  "--t-security-hit": TIMINGS.securityHit,
  "--t-security-arm": TIMINGS.securityArm,
  "--t-shield-break": TIMINGS.shieldBreak,
  "--t-shield-flash": TIMINGS.shieldFlash,
  "--t-security-branch": SECURITY_BRANCH_TOTAL_MS,
  "--t-security-count-pop": TIMINGS.securityCountPop,
  "--t-summoning-orbit": TIMINGS.summoningOrbit,
  "--t-clash-enter": TIMINGS.clashAttackerEnter,
  "--t-clash-reveal": TIMINGS.clashReveal,
  "--t-clash-outcome": TIMINGS.clashOutcome,
  "--t-clash-outcome-at": CLASH_OUTCOME_AT_MS,
  "--t-clash-total": CLASH_TOTAL_MS,
  "--t-showcase-in": TIMINGS.showcaseIn,
  "--t-showcase-out": TIMINGS.showcaseOut,
  "--t-showcase-out-at": SHOWCASE_OUT_AT_MS,
  "--t-card-burst": TIMINGS.cardBurst,
  "--t-draw-burst": TIMINGS.drawBurst,
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
