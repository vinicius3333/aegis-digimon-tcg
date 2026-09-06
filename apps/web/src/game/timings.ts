/* Every duration the match screen animates to, in one table. TypeScript reads
   the numbers directly; CSS reads them as custom properties set on the battle
   root (see `BATTLE_TIMING_STYLE`), so a keyframe and the timeout that unmounts
   its element can never drift apart.

   Each `var(--t-*)` in game.css carries the same number as its literal fallback,
   because overlays portalled to `document.body` sit outside the battle root and
   would otherwise animate with no duration at all. `timings.test.ts` fails if a
   fallback stops matching the table. */

import type { CSSProperties } from "react";
import { CARD_SHARD_SPREAD_MS } from "./cardShatter";
import type { CutInTier } from "./cutIn";

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
  /** One breath of the yellow ring around the chip memory currently sits on. */
  memoryGlow: 1600,
  /** The attack arrow drawing itself from attacker to target. */
  attackArrow: 380,
  /** The attacker leaning at the security stack it declared on. */
  attackLunge: 240,
  /** How long the attack call-out stays up. Long enough to read a card name, and no longer. */
  attackAnnounce: 800,
  /** The call-out fading in. */
  attackAnnounceIn: 140,
  /** The security shield flashing when a card is actually checked. */
  securityHit: 350,
  /**
   * The defender's shield arming — the blue glass the reference client switches to.
   * It arms at the declaration there (`AttackProcess.cs:134`), not at the check, so
   * this is only the beat the web needs for the change of glass to register.
   */
  securityArm: 120,
  /** The glass pane shattering (the reference client's `SecurityBreakGlass`, 250 ms). */
  shieldBreak: 250,
  /** The light that washes in from the defender's edge of the screen as the shield breaks. */
  shieldFlash: 320,
  /**
   * The beat held between the shatter and the reveal. The reference client holds
   * 60 + 170 + 100 ms there (`Effects.cs:1671-1689`, `CardController.cs:4002`), but it
   * spends them spawning a colour burst *after* the glass; the web port fires its burst
   * with the shatter, so those frames would be a stall with the centre of the screen
   * still empty. What is left is the remainder the 350 ms shield shake needs past the
   * 250 ms shatter, so the break phase ends on its own last moving frame.
   */
  securityBreakHold: 100,
  /** The revealed security card sliding out to its own side of the screen. */
  securityBranchIn: 220,
  /** How long the revealed card holds there while its effect notice reads. The notice outlives it. */
  securityBranchHold: 900,
  /** The card leaving for the trash or the field. */
  securityBranchOut: 220,
  /**
   * How long the docked card is held after its check finally closes, before it leaves.
   * The reference client holds 300 ms there (`CardController.cs:4106`) — the card has
   * been on screen for the whole resolution by then, so this is a beat, not a read.
   */
  securityDockHold: 300,
  /** How often the open-ended dock re-checks whether its check has closed. */
  securityDockPoll: 120,
  /**
   * The ceiling on that wait. The dock ends on the matching `securityChecked`, but the
   * centre-stage track is serial, so a close that never arrives (a dropped event, a
   * server that stopped answering) may not hold the track for the rest of the match.
   */
  securityDockMax: 45_000,
  /**
   * How long a security card an effect trashed is held readable before it breaks
   * (the reference client's 0.5 s between the reveal and `DestroySecurityEffect`).
   * It is the whole beat the player gets to see which card the stack just lost, so
   * it is longer than any hold the check itself takes.
   */
  securityDestroyHold: 500,
  /**
   * How long the cracks take to spread over a destroyed security card before it breaks.
   * Spent inside the hold, so the card is still readable under the fractures.
   */
  securityDestroyCrack: 180,
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
  /** How long the two cards stay readable before they resolve. The reference client holds 170 + 300ms. */
  clashHold: 900,
  /** The outcome beat: the reference client's parallel 250ms claw and shake, then its 100ms settle (`Effects.cs:2039-2160`). */
  clashOutcome: 350,
  /** The scene fading back out, on the turn banner's 160ms wipe. */
  clashExit: 160,
  /** The centre-screen card growing in on a zone change. */
  showcaseIn: 160,
  /** How long the announced card is held centre-screen before the board takes over. */
  showcaseHold: 1500,
  /** The centre-screen card clearing out of the way. */
  showcaseOut: 160,
  /** The colour-keyed rays and rings behind a card that just landed. */
  cardBurst: 800,
  /** The starburst at the hand slot where a turn-start draw lands. */
  drawBurst: 600,
  /** The full-width turn banner: the reference client's 160ms in, 300ms hold and 160ms out. */
  turnBanner: 620,
  /** How long a framed notice stays readable on its own. */
  noticeLifetime: 4200,
  /** A crowded notice stack disperses on this shorter clock instead. */
  noticeCrowdedLifetime: 2400,
  /** A notice sliding in from its anchor. */
  noticeIn: 200,
  /** How long one opponent action stays up in the corner feed. */
  feedAction: 3600,
  /** A feed entry carrying effect text to read is held longer than a bare title. */
  feedEffect: 5600,
  /** How long a side panel stays readable. Nothing on the board shortens it. */
  sidePanelLifetime: 5000,
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
  /** A pending-fate badge dropping onto the target that just got picked. */
  fateBadgeIn: 180,
  /** The dashed prediction arc fading in under the memory chips. */
  memoryPrediction: 200,
  /** The targeting mask darkening the board around the legal targets. */
  spotlightIn: 220,
  /** One breath of the ring around a lit target inside the mask. */
  spotlightPulse: 1600,
  /** The reference client's 0.25s card shake (`DOShakePosition`), on a refusal and on a lost battle. */
  cardShake: 250,
  /** The beat the reference client holds after a shake before it moves on. */
  cardShakeHold: 100,
  /** The claw sweeping across a permanent that lost its battle (0.25s, ease-in-cubic). */
  clawSlash: 250,
  /** The particles a DP change throws off. */
  dpPulse: 520,
  /** The reference client holds a DP change 0.1s … */
  dpPulseHold: 100,
  /** … and four times as long when the debuff is the one that kills. */
  dpPulseFatalHold: 400,
  /** The phase card wiping open (the reference client's 0.2333s scale-Y blind). */
  phaseBannerIn: 233,
  /** The phase card, end to end: the 0.2333s wipe open, its 0.3s hold, and the wipe shut. */
  phaseBanner: 766,
  /** One lap of the ring turning around the turn control while it is actionable. */
  turnControlPulse: 3200,
  /** How long the turn control refuses a second click after the first (a UI guard, not a rule). */
  turnControlCover: 1500,
  /** The WIN / LOSE word scaling and glowing into place. */
  resultSplashIn: 520,
  /** The full-screen digivolution cut-in, base tier (the reference client's 1.45 s). */
  cutIn: 1450,
  /** The DigiXros tier, which holds longer and shakes (2.0 s). */
  cutInXros: 2000,
  /** The DNA / Jogress tier, which flanks the result with its two sources (1.65 s). */
  cutInDna: 1650,
  /** The Burst tier, the longest of them (2.7 s). */
  cutInBurst: 2700,
  /** The cut-in's card and band wiping in, and back out again. */
  cutInWipe: 180,
  /** The play log sliding out of, and back into, the right edge. */
  logSidebar: 160,
  /** The jolt a permanent takes when an attack or block lock lands on it (0.2 s). */
  freezeShake: 200,
  /** One riffle of a deck pile being shuffled. */
  deckRiffle: 180,
  /** A card that just landed settling on its OutBounce drop. */
  landingBounce: 100,
  /** The dust kicked up where a card landed. */
  landingDust: 420,
  /** A recovered card spinning back onto the security stack. */
  securityFlight: 200,
  /** One of the target arrow's two opening flashes. */
  arrowFlash: 85,
  /** A card growing to its inspected size. */
  cardMagnify: 120,
  /** The glow a field permanent holds while its effect activates. */
  effectSourceHold: 480,
  /** A card flying up out of the trash pile as its effect activates. */
  effectTrashRise: 320,
  /** An Option rising out of the hand fan as it activates. */
  effectHandRise: 260,
  /** The card's own art breaking into shards where it was deleted. */
  cardShatter: 520,
} as const;

export type TimingName = keyof typeof TIMINGS;

/** The revealed card enters once the attacker has taken its place. */
export const CLASH_REVEAL_AT_MS = TIMINGS.clashAttackerEnter;

/** The outcome beat starts when the hold is over. */
export const CLASH_OUTCOME_AT_MS = CLASH_REVEAL_AT_MS + TIMINGS.clashReveal + TIMINGS.clashHold;

/**
 * When the revealed card has finished growing into place. The card has left the stack by
 * then, so this is the beat the defender's shield finally drops its figure — the reference
 * client reduces the stack right after the same clip (`CardController.cs:4008-4012`).
 */
export const CLASH_REVEAL_SHOWN_AT_MS = CLASH_REVEAL_AT_MS + TIMINGS.clashReveal;

/** End to end, which is also how long the scene stays mounted. */
export const CLASH_TOTAL_MS = CLASH_OUTCOME_AT_MS + TIMINGS.clashOutcome + TIMINGS.clashExit;

/**
 * When a card bound for its dock leaves the centre. It takes the same hold every other
 * check takes, so a reveal reads the same whatever follows it; the fork is at the beat
 * the outcome would start.
 */
export const CLASH_DOCK_AT_MS = CLASH_OUTCOME_AT_MS;

/** The docking scene end to end: the hold, then the fade the dock slides in behind. */
export const CLASH_DOCK_LEAVE_MS = CLASH_DOCK_AT_MS + TIMINGS.clashExit;

/**
 * How long a card's shards fly inside the centre-stage clash. A field deletion breaks on
 * the longer `cardShatter` clock because nothing takes the board back from it, but inside
 * the clash the card has only the outcome beat before the scene fades — so the shards, and
 * the stagger that starts the last of them, have to finish within it or they are cut off
 * mid-flight.
 */
export const CLASH_SHATTER_MS = TIMINGS.clashOutcome - CARD_SHARD_SPREAD_MS;

/** Shield break, end to end: the arm, the shatter, and the held frames after it. */
export const SECURITY_BREAK_TOTAL_MS = TIMINGS.securityArm + TIMINGS.shieldBreak + TIMINGS.securityBreakHold;

/** How long the revealed card takes to slide out to the side it reads out from. */
export const SECURITY_BRANCH_IN_MS = TIMINGS.securityBranchIn;

/**
 * When a destroyed security card breaks. It faces no attacker, so the beat starts as
 * soon as the card has grown into place and been held.
 */
export const SECURITY_DESTROY_OUTCOME_AT_MS =
  TIMINGS.clashAttackerEnter + TIMINGS.clashReveal + TIMINGS.securityDestroyHold;

/** One destroyed security card, end to end: the reveal, the hold, the break and the fade. */
export const SECURITY_DESTROY_TOTAL_MS = SECURITY_DESTROY_OUTCOME_AT_MS + TIMINGS.clashOutcome + TIMINGS.clashExit;

/** What the docked card still owes the screen once its check has closed: the hold, then the exit. */
export const SECURITY_DOCK_CLOSE_MS = TIMINGS.securityDockHold + TIMINGS.securityBranchOut;

/** The security-effect branch, end to end: the slide out, the hold, and the exit. */
export const SECURITY_BRANCH_TOTAL_MS =
  TIMINGS.securityBranchIn + TIMINGS.securityBranchHold + TIMINGS.securityBranchOut;

/** The centre-screen showcase, end to end: how long it stays mounted. */
export const SHOWCASE_TOTAL_MS = TIMINGS.showcaseIn + TIMINGS.showcaseHold + TIMINGS.showcaseOut;

/** When the showcase starts clearing out, which is also when the field may reveal. */
export const SHOWCASE_OUT_AT_MS = TIMINGS.showcaseIn + TIMINGS.showcaseHold;

/** A shake and the beat held after it — how long a shake cue owns its track. */
export const CARD_SHAKE_TOTAL_MS = TIMINGS.cardShake + TIMINGS.cardShakeHold;

/** The claw and the shake run together, so the impact ends when the held beat does. */
export const COMBAT_IMPACT_TOTAL_MS = Math.max(TIMINGS.clawSlash, TIMINGS.cardShake) + TIMINGS.cardShakeHold;

/** Two opening flashes before the target arrow settles into its persistent draw. */
export const ARROW_FLASH_COUNT = 2;

/** How long the arrow spends flashing before it stays extended. */
export const ARROW_FLASH_TOTAL_MS = TIMINGS.arrowFlash * ARROW_FLASH_COUNT * 2;

/** A board battle leans the attacker at its target once the arrow has extended. */
export const FIELD_CLASH_LUNGE_AT_MS = ARROW_FLASH_TOTAL_MS;

/** The blow lands when the lunge peaks into the defender. */
export const FIELD_CLASH_IMPACT_AT_MS = FIELD_CLASH_LUNGE_AT_MS + TIMINGS.attackLunge;

/** A board battle end to end: the arrow, the lunge, and the claw-and-shake it lands. */
export const FIELD_CLASH_TOTAL_MS = FIELD_CLASH_IMPACT_AT_MS + COMBAT_IMPACT_TOTAL_MS;

/** A cut-in, end to end, for the tier it is playing. */
export function cutInTotalMs(tier: CutInTier): number {
  switch (tier) {
    case "digiXros":
      return TIMINGS.cutInXros;
    case "dna":
      return TIMINGS.cutInDna;
    case "burst":
      return TIMINGS.cutInBurst;
    case "base":
      return TIMINGS.cutIn;
  }
}

/** A DP pulse, end to end: the particles plus the beat the new figure is held on. */
export function dpPulseTotalMs(fatal: boolean): number {
  return TIMINGS.dpPulse + (fatal ? TIMINGS.dpPulseFatalHold : TIMINGS.dpPulseHold);
}

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
  "--t-security-branch-in": TIMINGS.securityBranchIn,
  "--t-security-branch-out": TIMINGS.securityBranchOut,
  "--t-security-dock-hold": TIMINGS.securityDockHold,
  "--t-security-count-pop": TIMINGS.securityCountPop,
  "--t-summoning-orbit": TIMINGS.summoningOrbit,
  "--t-clash-enter": TIMINGS.clashAttackerEnter,
  "--t-clash-reveal": TIMINGS.clashReveal,
  "--t-clash-outcome": TIMINGS.clashOutcome,
  "--t-clash-outcome-at": CLASH_OUTCOME_AT_MS,
  "--t-clash-exit": TIMINGS.clashExit,
  "--t-clash-crack": TIMINGS.securityDestroyCrack,
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
  "--t-fate-badge-in": TIMINGS.fateBadgeIn,
  "--t-memory-prediction": TIMINGS.memoryPrediction,
  "--t-spotlight-in": TIMINGS.spotlightIn,
  "--t-spotlight-pulse": TIMINGS.spotlightPulse,
  "--t-card-shake": TIMINGS.cardShake,
  "--t-claw-slash": TIMINGS.clawSlash,
  "--t-dp-pulse": TIMINGS.dpPulse,
  "--t-phase-banner": TIMINGS.phaseBanner,
  "--t-turn-control-pulse": TIMINGS.turnControlPulse,
  "--t-result-splash-in": TIMINGS.resultSplashIn,
  "--t-cut-in": TIMINGS.cutIn,
  "--t-cut-in-xros": TIMINGS.cutInXros,
  "--t-cut-in-dna": TIMINGS.cutInDna,
  "--t-cut-in-burst": TIMINGS.cutInBurst,
  "--t-cut-in-wipe": TIMINGS.cutInWipe,
  "--t-log-sidebar": TIMINGS.logSidebar,
  "--t-freeze-shake": TIMINGS.freezeShake,
  "--t-deck-riffle": TIMINGS.deckRiffle,
  "--t-landing-bounce": TIMINGS.landingBounce,
  "--t-landing-dust": TIMINGS.landingDust,
  "--t-security-flight": TIMINGS.securityFlight,
  "--t-arrow-flash": TIMINGS.arrowFlash,
  "--t-card-magnify": TIMINGS.cardMagnify,
  "--t-effect-source-hold": TIMINGS.effectSourceHold,
  "--t-effect-trash-rise": TIMINGS.effectTrashRise,
  "--t-effect-hand-rise": TIMINGS.effectHandRise,
  "--t-card-shatter": TIMINGS.cardShatter,
  "--t-clash-shatter": CLASH_SHATTER_MS,
};

/**
 * Spread onto the battle root so every keyframe below it reads its duration from
 * this table.
 */
export const BATTLE_TIMING_STYLE: CSSProperties = Object.fromEntries(
  Object.entries(BATTLE_TIMING_VARIABLES).map(([name, ms]) => [name, `${ms}ms`]),
) as CSSProperties;
