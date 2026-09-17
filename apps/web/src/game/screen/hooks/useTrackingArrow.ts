import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import type { DecisionRequest, GameState, Seat, ServerEvent } from "@aegis/shared";
import { clipToBox, type ArrowBox } from "../../arrowGeometry";
import { activeAttackArrow, effectTargetArrow, type ArrowEndpoint, type TrackingArrow } from "../../trackingArrow";
import type { FieldClashScene } from "../../fieldClash";
import { DragKind } from "../enums";
import { permanentVisualElement } from "../dropZones";
import type { TrackingArrowGeometry } from "../types";

/**
 * The live target arrow (`TargetArrow.cs`).
 *
 * What it points at is protocol truth — the declared attack still open, or the targets the
 * viewer has picked for the effect currently asking. Where those cards *are* changes
 * constantly (a card suspends, the board reflows, the hand grows), so the endpoints are
 * re-solved every frame while the arrow is up rather than measured once at declaration.
 *
 * A battle that declares and resolves in one batch never has an open attack in the log, so
 * the clash scene keeps its own arrow up while it plays.
 */
export function useTrackingArrow({
  state,
  events,
  decision,
  picks,
  viewerSeat,
  fieldClash,
  boardRef,
  permRefs,
  permCentersRef,
  viewerSecurityRef,
  opponentSecurityRef,
}: {
  state: GameState | undefined;
  events: readonly ServerEvent[];
  decision: DecisionRequest | undefined;
  picks: readonly string[];
  viewerSeat: Seat;
  fieldClash: FieldClashScene | null;
  boardRef: RefObject<HTMLDivElement | null>;
  permRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  /** Where each permanent last stood, so a deleted card's arrow still reaches it. */
  permCentersRef: MutableRefObject<Record<string, { x: number; y: number }>>;
  viewerSecurityRef: RefObject<HTMLDivElement | null>;
  opponentSecurityRef: RefObject<HTMLDivElement | null>;
}): TrackingArrowGeometry | null {
  const attackerCardIds = new Map(
    [...(state?.players ?? [])].flatMap((player) =>
      [...player.battleArea, ...(player.breeding ? [player.breeding] : [])].flatMap((permanent) =>
        permanent.topCard?.cardId ? [[permanent.topCard.cardId, permanent.permanentId] as const] : [],
      ),
    ),
  );
  const fieldClashArrow: TrackingArrow | null = fieldClash
    ? {
        kind: DragKind.Attack,
        key: `clash:${fieldClash.key}`,
        from: { kind: "permanent", permanentId: fieldClash.attacker.permanentId },
        to: [{ kind: "permanent", permanentId: fieldClash.defender.permanentId }],
      }
    : null;
  const trackingArrowRequest =
    fieldClashArrow ??
    activeAttackArrow(events) ??
    effectTargetArrow({
      decision,
      picks,
      viewerSeat,
      sourcePermanentId: decision?.sourceCardId ? attackerCardIds.get(decision.sourceCardId) : undefined,
    });
  const [trackingArrow, setTrackingArrow] = useState<TrackingArrowGeometry | null>(null);
  const trackingArrowRef = useRef<TrackingArrow | null>(null);
  trackingArrowRef.current = trackingArrowRequest;
  const trackingArrowActive = trackingArrowRequest !== null;
  useEffect(() => {
    if (!trackingArrowActive) {
      setTrackingArrow(null);
      return;
    }
    let frame = 0;
    let applied = "";
    const endpoint = (end: ArrowEndpoint, board: DOMRect): ArrowBox | undefined => {
      const element =
        end.kind === "permanent"
          ? permRefs.current[end.permanentId]
          : end.seat === viewerSeat
            ? viewerSecurityRef.current
            : opponentSecurityRef.current;
      // A permanent deleted by the battle has left the board, but the arrow must still reach
      // where it stood, so its last measurement stands in.
      if (!element?.isConnected) {
        return end.kind === "permanent" ? permCentersRef.current[end.permanentId] : undefined;
      }
      const rect = (end.kind === "permanent" ? permanentVisualElement(element) : element).getBoundingClientRect();
      if (!rect.width) return undefined;
      return {
        x: rect.left + rect.width / 2 - board.left,
        y: rect.top + rect.height / 2 - board.top,
        halfWidth: rect.width / 2,
        halfHeight: rect.height / 2,
      };
    };
    const solve = () => {
      frame = window.requestAnimationFrame(solve);
      const request = trackingArrowRef.current;
      const board = boardRef.current;
      if (!request || !board) return;
      const boardRect = board.getBoundingClientRect();
      const fromBox = endpoint(request.from, boardRect);
      const toBoxes = request.to.flatMap((end) => {
        const box = endpoint(end, boardRect);
        return box ? [box] : [];
      });
      const firstTarget = toBoxes[0];
      if (!fromBox || !firstTarget) {
        if (applied !== "") {
          applied = "";
          setTrackingArrow(null);
        }
        return;
      }
      // The tail leaves the attacker towards its first target; every beam stops short of the
      // box it points at so the card under attack stays readable.
      const from = clipToBox(fromBox, firstTarget);
      const to = toBoxes.map((box) => clipToBox(box, fromBox));
      const signature = `${request.key}|${Math.round(from.x)},${Math.round(from.y)}|${to
        .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
        .join(";")}`;
      if (signature === applied) return;
      applied = signature;
      setTrackingArrow({ key: request.key, kind: request.kind, from, to });
    };
    frame = window.requestAnimationFrame(solve);
    return () => window.cancelAnimationFrame(frame);
  }, [trackingArrowActive, viewerSeat]);
  return trackingArrow;
}
