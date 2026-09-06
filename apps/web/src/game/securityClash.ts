/* What a centre-stage security check shows: the attacking Digimon, the card that
   was revealed opposite it, and the outcome the two of them resolved into. The
   drawing lives in ./SecurityClashView; this module only decides the contents and
   owns the timeline the CSS keyframes are cut to. */

import { getCardDefinition, isDigimon, type SecurityBattleResult, type Seat, type ServerEvent } from "@aegis/shared";
import {
  CLASH_OUTCOME_AT_MS,
  CLASH_REVEAL_AT_MS,
  CLASH_TOTAL_MS,
  SECURITY_BRANCH_TOTAL_MS as BRANCH_TOTAL_MS,
  SECURITY_BREAK_TOTAL_MS as BREAK_TOTAL_MS,
  SECURITY_DESTROY_OUTCOME_AT_MS as DESTROY_OUTCOME_AT_MS,
  SECURITY_DESTROY_TOTAL_MS as DESTROY_TOTAL_MS,
  TIMINGS,
} from "./timings";

/**
 * `pending` is the client's own: the card has been revealed (`securityRevealed`) and the
 * check has not closed yet, so the scene holds the card on stage while whatever it caused
 * resolves. The other three come from the server's `securityChecked.resolution`.
 */
export type SecurityClashResolution = "pending" | "battle" | "effect" | "trashed";
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
  /**
   * When the outcome beat starts, measured from the moment the scene mounts, overriding
   * the check's own timeline. Zero for an outcome that reached a scene already on stage
   * — the check took a decision or two to close, so its beat starts at the settle rather
   * than on the clock the reveal began. Drawn as `--t-clash-outcome-at`.
   */
  outcomeAtMs?: number;
  /**
   * What put the card on stage. A `check` is the security check the printed rules run;
   * a `destruction` is an effect that trashed the stack outright (Ragnarok Cannon), which
   * faces no attacker and compares no DP. Only what the scene calls itself differs — the
   * card is revealed and broken the same way either way. Defaults to `check`.
   */
  cause?: SecurityClashCause;
  /**
   * The card is on its way to the side dock: the scene fades out now, ahead of any outcome,
   * which the dock and the close will show. Only a `pending` scene ever departs.
   */
  departing?: boolean;
}

export type SecurityClashCause = "check" | "destruction";

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

/** How long one destroyed security card owns the centre of the screen. */
export const SECURITY_DESTROY_TOTAL_MS = DESTROY_TOTAL_MS;

/** When that card breaks, which is also when its scene starts fading. */
export const SECURITY_DESTROY_OUTCOME_AT_MS = DESTROY_OUTCOME_AT_MS;

/** Which shield breaks, and on whose edge of the screen the flash washes in. */
export interface SecurityBreakScene {
  key: number;
  /** The checked player's seat, which is the shield that shatters. */
  seat: Seat;
  side: SecurityClashSide;
  /**
   * Throws this break's shards. The pane is the same six pieces every time, but a
   * fixed set of directions makes back-to-back checks (Strike 2, a second attack)
   * read as one repeated frame — so each check derives its own from its key
   * (battle-animation-spec.md §4b).
   */
  seed: number;
}

/**
 * How the docked card is currently behaving.
 * - `docked` — the server is still resolving the check, so the card stays put for as
 *   long as that takes (the reference client's brainstorm slot, `CardController.cs:4062`).
 * - `closing` — the check has closed: the card holds a beat and then leaves.
 * - `settled` — the whole detour is one fixed animation, which is what a check whose
 *   reveal and close arrived together (or a server that sends no reveal hints) gets.
 */
export type SecurityBranchState = "docked" | "closing" | "settled";

/** The revealed card, held on its own side of the screen while its effect resolves. */
export interface SecurityBranchScene {
  key: number;
  cardId: string;
  side: SecurityClashSide;
  state: SecurityBranchState;
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
  return { key, seat: defenderSeat, side: defenderSeat === viewerSeat ? "you" : "opp", seed: key };
}

/**
 * The card parked in the side dock while the server resolves its `[Security]` effect.
 * Unlike {@link buildSecurityBranchScene} this is built at the REVEAL, off the event's
 * `hasSecurityEffect` hint, because the resolution is not known yet.
 */
export function buildSecurityDockScene({
  key,
  revealedCardId,
  defenderSeat,
  viewerSeat,
}: {
  key: number;
  revealedCardId: string;
  defenderSeat: Seat;
  viewerSeat: Seat;
}): SecurityBranchScene {
  return { key, cardId: revealedCardId, side: defenderSeat === viewerSeat ? "you" : "opp", state: "docked" };
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
  return { key, cardId: revealedCardId, side: defenderSeat === viewerSeat ? "you" : "opp", state: "settled" };
}

const RESOLUTIONS: readonly string[] = ["battle", "effect", "trashed"];

export function normalizeSecurityClashResolution(resolution: string): SecurityClashResolution {
  return RESOLUTIONS.includes(resolution) ? (resolution as SecurityClashResolution) : "trashed";
}

function comparableDp(cardId: string): number | undefined {
  const definition = getCardDefinition(cardId);
  return definition && isDigimon(definition) ? definition.dp : undefined;
}

/**
 * The scene the reveal opens with: both cards on stage, no verdict yet. The outcome is
 * grafted on by {@link settleSecurityClashScene} when `securityChecked` closes the check,
 * which may be a decision or two later.
 */
export function buildSecurityRevealScene({
  key,
  revealedCardId,
  defenderSeat,
  viewerSeat,
  attacker,
}: {
  key: number;
  revealedCardId: string;
  /** Seat whose security was checked, i.e. the `securityRevealed` seat. */
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
    resolution: "pending",
    revealed: { cardId: revealedCardId, side: defenderSide, dp: comparableDp(revealedCardId) },
    ...(facing ? { attacker: { cardId: facing.cardId, side: attackerSide, dp: comparableDp(facing.cardId) } } : {}),
  };
}

/** Graft the closed check's outcome onto the scene the reveal put on stage. */
export function settleSecurityClashScene(
  scene: SecurityClashScene,
  { resolution, battle, outcomeAtMs }: { resolution: string; battle?: SecurityBattleResult; outcomeAtMs?: number },
): SecurityClashScene {
  return {
    ...scene,
    resolution: normalizeSecurityClashResolution(resolution),
    ...(outcomeAtMs === undefined ? {} : { outcomeAtMs }),
    // Without an attacker on stage there is no side to claw, so the verdict is dropped
    // rather than shown against a card that is not there.
    ...(scene.attacker && battle
      ? { loser: { attacker: battle.attackerDeleted, revealed: battle.securityDigimonDeleted } }
      : {}),
  };
}

/** The whole scene at once, for a check whose reveal and outcome are already both known. */
export function buildSecurityClashScene({
  resolution,
  battle,
  ...reveal
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
  return settleSecurityClashScene(buildSecurityRevealScene(reveal), { resolution, ...(battle ? { battle } : {}) });
}

/**
 * One security card an effect trashed outright, revealed and then broken where it stood.
 * It faced no attacker and no DP was compared, so the scene is the card alone: the same
 * reveal the check plays, held long enough to read, then the shatter `trashed` already
 * draws. The break beat is pulled forward to {@link SECURITY_DESTROY_OUTCOME_AT_MS},
 * because there is no attacker entrance to wait out.
 *
 * A destruction that takes several cards is several scenes, one per card, in the order
 * the stack lost them — the reference client plays the whole sequence once per card
 * rather than announcing the count.
 */
export function buildSecurityDestructionScene({
  key,
  cardId,
  trashedSeat,
  viewerSeat,
}: {
  key: number;
  cardId: string;
  /** Seat whose security stack lost the card. */
  trashedSeat: Seat;
  viewerSeat: Seat;
}): SecurityClashScene {
  return {
    ...buildSecurityRevealScene({ key, revealedCardId: cardId, defenderSeat: trashedSeat, viewerSeat }),
    resolution: "trashed",
    cause: "destruction",
    outcomeAtMs: DESTROY_OUTCOME_AT_MS,
  };
}

/**
 * The figure a security shield shows. The board drops a checked or trashed card the
 * moment the server's patch lands, which is seconds before the scene that shows the
 * card leaving has played — so the count fell while the shield was still intact. A
 * scene holding a card it has not shown leaving publishes the figure it started with,
 * and the shield keeps whichever is higher until the card is seen to go (the reference
 * client reduces the stack only after `EnterSecurityCardEffect`, `CardController.cs:4008`).
 *
 * `max` rather than the held figure outright: a recovery that lands mid-scene is an
 * increase, and the shield has no reason to hide one.
 */
export function shieldSecurityCount(liveCount: number, heldCount: number | undefined): number {
  return heldCount === undefined ? liveCount : Math.max(liveCount, heldCount);
}

/* The zone names `cardsMoved` uses for an effect-driven security trash. A security CHECK
   never emits this pair — it moves the checked card through its own seam — so a movement
   out of security and into the trash is always an effect (or a cost) spending the stack. */
const SECURITY_ZONE = "security";

const TRASH_ZONE = "trash";

/** One security card an effect spent, resolved to the identity a scene can draw. */
export interface SecurityDestruction {
  cardId: string;
  /** The seat whose stack lost it. */
  seat: Seat;
}

/**
 * The security cards this batch of events had trashed by an effect, in the order the
 * stacks lost them. The event itself carries the identities and the seat (the cards
 * are face-up in a public trash the moment it is emitted); an event predating that
 * enrichment falls back to the caller's index of the board the movement landed on.
 *
 * The fallback matters because the event is broadcast before the state patch that
 * puts the card in the trash, so the index can be one patch behind. A card neither
 * the event nor the index can name is dropped rather than drawn as an anonymous
 * back: a scene that cannot say WHICH card was lost is worse than none.
 */
export function securityDestructionsFromEvents(
  events: readonly ServerEvent[],
  lookup: { cardId: (instanceId: string) => string | undefined; seat: (instanceId: string) => Seat | undefined },
): readonly SecurityDestruction[] {
  const destroyed: SecurityDestruction[] = [];
  for (const event of events) {
    if (event.kind !== "cardsMoved" || event.from !== SECURITY_ZONE || event.to !== TRASH_ZONE) continue;
    event.instanceIds.forEach((instanceId, index) => {
      const cardId = event.cardIds?.[index] ?? lookup.cardId(instanceId);
      const seat = event.seat ?? lookup.seat(instanceId);
      if (cardId === undefined || seat === undefined) return;
      destroyed.push({ cardId, seat });
    });
  }
  return destroyed;
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
