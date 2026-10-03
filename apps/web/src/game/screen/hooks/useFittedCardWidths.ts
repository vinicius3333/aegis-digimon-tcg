import { useEffect, useState, type RefObject } from "react";

const CARD_ASPECT = 7 / 5;
/** Room above a card for its stack and keyword badges, which sit over its top edge. */
const PERMANENT_BADGE_ROOM = 12;
/** Room under a pile for its caption. */
const PILE_CAPTION_ROOM = 16;
const MIN_CARD_WIDTH = 28;

export function fittedCardWidth(height: number, reserved: number, preferred: number): number {
  const fitted = Math.floor((height - reserved) / CARD_ASPECT);
  return Math.max(MIN_CARD_WIDTH, Math.min(preferred, fitted));
}

/**
 * Shrinks battle-row cards and piles until they fit the height their row really has.
 *
 * Only for layouts whose two battle rows split the field's free height evenly around
 * the memory band (the landscape phone grid). There the row height does not depend on
 * the cards, so measuring it cannot feed back into itself.
 */
export function useFittedCardWidths({
  fieldRef,
  enabled,
  permanentWidth,
  pileWidth,
}: {
  fieldRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  permanentWidth: number;
  pileWidth: number;
}): { permanentWidth: number; pileWidth: number } {
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const field = fieldRef.current;

  useEffect(() => {
    if (!enabled || !field) {
      setRowHeight(null);
      return;
    }
    const measure = () => {
      const band = field.querySelector<HTMLElement>(".game-memory-band");
      const height = (field.clientHeight - (band?.offsetHeight ?? 0)) / 2;
      setRowHeight(height > 0 ? Math.floor(height) : null);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(field);
    measure();
    return () => observer.disconnect();
  }, [enabled, field]);

  if (rowHeight === null) return { permanentWidth, pileWidth };
  return {
    permanentWidth: fittedCardWidth(rowHeight, PERMANENT_BADGE_ROOM, permanentWidth),
    pileWidth: fittedCardWidth(rowHeight, PILE_CAPTION_ROOM, pileWidth),
  };
}
