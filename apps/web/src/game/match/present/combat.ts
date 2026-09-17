import type { MutableRefObject } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import { buildFieldClashScene, trackOpenAttack, type FieldClashScene, type OpenAttack } from "../../fieldClash";
import { FIELD_CLASH_TOTAL_MS } from "../../timings";
import type { MatchCueAnchors } from "../types";

/**
 * The field-clash scenes one batch's `combatResolved` events cut from the open attack, plus
 * the permanents a plain (non-clash) combat deletion beat.
 *
 * A permanent that lost a battle takes the claw and the shake first, and its burst waits
 * behind them — the reference client hits the card, then breaks it. Only combat deletions get
 * the impact; an effect deletion has no blow to land. A battle whose defender is known plays
 * the whole scene — arrow, lunge, then the blow — so its losers wait on the longer clock.
 */
export function combatScenes({
  fresh,
  viewerSeat,
  fieldClashKeyRef,
  openAttackRef,
  anchors,
  lastVisibleArtRef,
}: {
  fresh: readonly ServerEvent[];
  viewerSeat: Seat;
  /** Mutated: incremented per scene so a new scene restarts its animation instead of resuming one. */
  fieldClashKeyRef: MutableRefObject<number>;
  /** Mutated: the attack remembered across batches, advanced event by event. */
  openAttackRef: MutableRefObject<OpenAttack | null>;
  anchors: Pick<MatchCueAnchors, "permanentCardId">;
  lastVisibleArtRef: MutableRefObject<Map<string, string>>;
}): {
  beaten: Set<string>;
  clashScenes: FieldClashScene[];
  clashLoserIds: Set<string>;
  combatLeadInMs: number;
} {
  const beaten = new Set<string>();
  const clashScenes: FieldClashScene[] = [];
  const clashLoserIds = new Set<string>();
  for (const event of fresh) {
    if (event.kind === "combatResolved") {
      const scene = buildFieldClashScene({
        key: (fieldClashKeyRef.current += 1),
        open: openAttackRef.current,
        event,
        viewerSeat,
        cardIdOf: (permanentId) => anchors.permanentCardId?.(permanentId),
        artIdOf: (permanentId) => lastVisibleArtRef.current.get(permanentId),
      });
      if (scene) {
        clashScenes.push(scene);
        for (const permanentId of event.deletedPermanentIds) clashLoserIds.add(permanentId);
      } else {
        for (const permanentId of event.deletedPermanentIds) beaten.add(permanentId);
      }
    }
    openAttackRef.current = trackOpenAttack(openAttackRef.current, event);
  }
  /**
   * How long the battle owns the screen before anything it caused may be narrated.
   *
   * The server holds `combatResolved` until the attack reaches its end-of-attack seam, so a
   * batch carries the battle's consequences — the deletion triggers, the effects they fire —
   * ahead of the event the scene is cut from. Playing those at once would read as the effects
   * firing first and the two cards fighting afterwards, over a board the loser has already
   * left. The battle plays out first instead, and the cues that explain it wait for the blow
   * to land.
   */
  const combatLeadInMs = clashScenes.length > 0 ? FIELD_CLASH_TOTAL_MS : 0;
  return { beaten, clashScenes, clashLoserIds, combatLeadInMs };
}
