import { Side } from "./side";
import { TIMINGS } from "./timings";

/** Distances relative to the upright temporary face, whose authored scale is 0.45. */
export const DRAW_PRESENTATION_GEOMETRY = {
  entryWidths: 60 / (100 * 0.45),
  viewerEntryHeights: 40 / (140 * 0.45),
  // Approximate deck-relative resting pose observed in the primary viewer draw.
  inwardWidths: 0.4,
  viewerDownHeights: 0.06,
} as const;

export function drawPresentationTiming(side: Side) {
  const hold = side === Side.Viewer ? TIMINGS.drawPresentationHold : TIMINGS.drawPresentationOpponentHold;
  const exit = TIMINGS.drawPresentationIn + hold;
  return {
    exit,
    handoff: exit + TIMINGS.drawPresentationHandoff,
    total: exit + TIMINGS.drawPresentationNarrow + TIMINGS.drawPresentationUp,
  };
}
