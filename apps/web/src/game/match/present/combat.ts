import type { MutableRefObject } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import {
  buildBattleDeletionScene,
  buildComparedBattleScene,
  buildFieldClashScene,
  trackOpenAttack,
  fieldClashDurationMs,
  type FieldClashScene,
  type OpenAttack,
} from "../../fieldClash";
import type { MatchCueAnchors } from "../types";
import { attackDeclarationKey } from "../../trackingArrow";
import { COMBAT_IMPACT_TOTAL_MS } from "../../timings";

/**
 * The field-clash scenes one batch's `combatResolved` events cut from the open attack, plus
 * the permanents a plain (non-clash) combat deletion beat.
 *
 * A permanent that lost a battle takes the claw and the shake first, and its burst waits
 * behind them — the reference client hits the card, then breaks it. Only combat deletions get
 * the impact; an effect deletion has no blow to land. A battle whose defender is known plays
 * the whole scene — arrow, then the blow — so its losers wait on the longer clock.
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
  anchors: Pick<MatchCueAnchors, "permanentCardId" | "attackArrowClock">;
  lastVisibleArtRef: MutableRefObject<Map<string, string>>;
}): {
  beaten: Set<string>;
  clashScenes: FieldClashScene[];
  clashLoserIds: Set<string>;
  combatLeadInMs: number;
  clashLeadInMsByPermanent: Map<string, number>;
} {
  const beaten = new Set<string>();
  const clashScenes: FieldClashScene[] = [];
  const clashLoserIds = new Set<string>();
  const cardIdOf = (permanentId: string) => anchors.permanentCardId?.(permanentId);
  const artIdOf = (permanentId: string) => lastVisibleArtRef.current.get(permanentId);
  const stage = (scene: FieldClashScene) => {
    const arrowClock = scene.arrowKey
      ? anchors.attackArrowClock?.(scene.attacker.permanentId, scene.arrowKey)
      : undefined;
    if (arrowClock) scene = { ...scene, arrowClock };
    clashScenes.push(scene);
    for (const permanentId of scene.loserPermanentIds) clashLoserIds.add(permanentId);
    const open = openAttackRef.current;
    if (open) openAttackRef.current = { ...open, staged: true };
  };
  for (const event of fresh) {
    if (event.kind === "battleCompared") {
      const scene = buildComparedBattleScene({
        key: fieldClashKeyRef.current + 1,
        open: openAttackRef.current,
        event,
        viewerSeat,
        cardIdOf,
        artIdOf,
      });
      if (scene) {
        fieldClashKeyRef.current += 1;
        stage(scene);
      }
    }
    if (event.kind === "cardsMoved") {
      const scene = buildBattleDeletionScene({
        key: fieldClashKeyRef.current + 1,
        open: openAttackRef.current,
        event,
        viewerSeat,
        cardIdOf,
        artIdOf,
      });
      if (scene) {
        fieldClashKeyRef.current += 1;
        stage(scene);
      }
    }
    if (event.kind === "combatResolved") {
      // A battle already staged from its deletion has had its blow; the seam that follows is
      // bookkeeping, and replaying it would swing at a card that left the board batches ago.
      const staged = openAttackRef.current?.staged === true;
      const scene = staged
        ? null
        : buildFieldClashScene({
            key: fieldClashKeyRef.current + 1,
            open: openAttackRef.current,
            event,
            viewerSeat,
            cardIdOf,
            artIdOf,
          });
      if (scene) {
        fieldClashKeyRef.current += 1;
        stage(scene);
      } else if (!staged) {
        for (const permanentId of event.deletedPermanentIds) beaten.add(permanentId);
      }
    }
    const previous = openAttackRef.current;
    const next = trackOpenAttack(previous, event);
    if (event.kind === "attackDeclared" && next)
      next.arrowKey = event.redirected && previous?.arrowKey ? previous.arrowKey : attackDeclarationKey(event);
    openAttackRef.current = next;
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
  const combatLeadInMs = Math.max(
    beaten.size > 0 ? COMBAT_IMPACT_TOTAL_MS : 0,
    ...clashScenes.map(fieldClashDurationMs),
  );
  const clashLeadInMsByPermanent = new Map<string, number>();
  for (const scene of clashScenes)
    for (const id of scene.loserPermanentIds) clashLeadInMsByPermanent.set(id, fieldClashDurationMs(scene));
  return { beaten, clashScenes, clashLoserIds, combatLeadInMs, clashLeadInMsByPermanent };
}
