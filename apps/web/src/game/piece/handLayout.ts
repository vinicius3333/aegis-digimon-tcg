import { HAND_CARD_WIDTH } from "./constants";

/** Room under the cards for the fan's downward arc and the rotated bottom corners. */
export const HAND_FAN_ROOM = 28;
export const HAND_MAX_FAN = 14;
/** The outermost cards are rotated, so each end of the fan reaches past its card box. */
export const HAND_TILT_BLEED = 20;
/**
 * The gap the phone strip leaves between two hand cards, mirroring the stylesheet's
 * `--game-hand-gap`. A scroll cue moves the row by exactly one card and its gap, so
 * the card it uncovers lands whole against the edge it came from.
 */
export const HAND_TOUCH_GAP = 16;

const handMinOverlap = (cardWidth: number) => Math.round(cardWidth * 0.26);
/**
 * The sliver a buried card keeps: enough to read its cost and level corner with a
 * mouse. HAND_MIN_EXPOSURE_TOUCH (constants.ts) sets the wider touch equivalent.
 */
export const HAND_MIN_EXPOSURE = 30;
/**
 * How far a card may be buried before the fan stops tightening. A hand big enough
 * to need more than this overflows, which only phone widths reach — there the row
 * scrolls instead.
 */
const handMaxOverlap = (cardWidth: number, minExposure: number) => cardWidth - minExposure;
export const handRowHeight = (cardWidth: number) => Math.round(cardWidth * 1.4) + HAND_FAN_ROOM + 1;

export function handOverlap(
  cardCount: number,
  rowWidth: number,
  cardWidth = HAND_CARD_WIDTH,
  minExposure = HAND_MIN_EXPOSURE,
): number {
  const min = handMinOverlap(cardWidth);
  if (cardCount < 2 || rowWidth <= 0) return min;
  const available = rowWidth - HAND_TILT_BLEED * 2;
  const needed = cardWidth * cardCount - min * (cardCount - 1);
  if (needed <= available) return min;
  const fitting = (cardWidth * cardCount - available) / (cardCount - 1);
  return Math.max(min, Math.min(handMaxOverlap(cardWidth, minExposure), Math.ceil(fitting)));
}
