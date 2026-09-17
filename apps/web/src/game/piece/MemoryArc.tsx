import { memoryArcPath } from "../memoryArc";

/**
 * The red arc a memory jump leaves behind, drawn over the chips it crossed. The
 * geometry is pure (`memoryArc.ts`); the box is stretched over the track, so the
 * stroke is kept from stretching with it.
 */
export function MemoryArc({ from, to }: { from: number; to: number }) {
  return (
    <svg
      className="game-memory-arc"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Normalised length, so the draw-on dash array is the same 100 units whatever
          the arc's real length turns out to be. */}
      <path d={memoryArcPath(from, to)} pathLength={100} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
