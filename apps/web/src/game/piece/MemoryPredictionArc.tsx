import { memoryPredictionPath } from "../memoryArc";

/**
 * Where memory would land if the card the player is holding were played. Same
 * shape as MemoryArc, hanging under the chips and dashed rather than solid, so
 * the two never read as one line when both are on screen.
 */
export function MemoryPredictionArc({ from, to }: { from: number; to: number }) {
  return (
    <svg
      className="game-memory-prediction"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={memoryPredictionPath(from, to)} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
