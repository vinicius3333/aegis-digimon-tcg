/* The arrow that follows the chosen attacker to what it would hit.

   It re-measures on every frame because the endpoints move for reasons no dependency
   list can see — a card suspending, a row re-flowing, the board resizing — and it only
   commits a new pair of endpoints when the rounded geometry actually changed, so a
   still board re-renders nothing. */

import { useEffect, useState, type RefObject } from "react";
import type { GameState } from "@aegis/shared";
import { beamBetweenBoxes, type ArrowBox } from "../../arrowGeometry";
import { permanentVisualElement } from "../dropZones";

export function useAttackPreviewArrow({
  attackerPermanentId,
  state,
  boardRef,
  permanentRefs,
  opponentSecurityRef,
  targetRef,
}: {
  attackerPermanentId: string | null;
  /** Re-measured on every server revision, since the board moves with it. */
  state: GameState | undefined;
  boardRef: RefObject<HTMLDivElement | null>;
  permanentRefs: RefObject<Record<string, HTMLDivElement | null>>;
  opponentSecurityRef: RefObject<HTMLDivElement | null>;
  /** What the attacker would hit: the shield, or the first permanent it may attack. */
  targetRef: RefObject<{ security: boolean; permanentId?: string }>;
}) {
  const [arrow, setArrow] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  useEffect(() => {
    if (!attackerPermanentId) {
      setArrow(null);
      return;
    }
    let frame = 0;
    let applied = "";
    const measure = () => {
      frame = window.requestAnimationFrame(measure);
      const b = boardRef.current;
      const a = permanentRefs.current[attackerPermanentId];
      const preview = targetRef.current;
      const target = preview.security
        ? opponentSecurityRef.current
        : preview.permanentId
          ? permanentRefs.current[preview.permanentId]
          : null;
      if (!b || !a || !target) {
        setArrow(null);
        return;
      }
      const br = b.getBoundingClientRect();
      const boxOf = (rect: DOMRect): ArrowBox => ({
        x: rect.left + rect.width / 2 - br.left,
        y: rect.top + rect.height / 2 - br.top,
        halfWidth: rect.width / 2,
        halfHeight: rect.height / 2,
      });
      const next = beamBetweenBoxes(
        boxOf(permanentVisualElement(a).getBoundingClientRect()),
        boxOf((preview.security ? target : permanentVisualElement(target)).getBoundingClientRect()),
      );
      const signature = `${Math.round(next.from.x)},${Math.round(next.from.y)}|${Math.round(next.to.x)},${Math.round(next.to.y)}`;
      if (signature === applied) return;
      applied = signature;
      setArrow(next);
    };
    frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackerPermanentId, state]);
  return arrow;
}
