/* Outlines the offered targets without dimming the rest of the board.
   Pointer events pass through to the selectable cards underneath. */

import { spotlightHoles, type SpotlightSubject } from "./spotlight";

export function TargetingSpotlight({
  subjects,
  width,
  height,
}: {
  /** The offered cards, measured in board coordinates. */
  subjects: readonly SpotlightSubject[];
  width: number;
  height: number;
}) {
  const holes = spotlightHoles(subjects);
  if (holes.length === 0 || width <= 0 || height <= 0) return null;
  return (
    <svg
      className="game-spotlight"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {holes
        .filter((hole) => hole.ring !== false)
        .map((hole) => (
          <rect
            key={hole.id}
            className="game-spotlight__ring"
            x={hole.x}
            y={hole.y}
            width={hole.width}
            height={hole.height}
            rx={hole.radius}
          />
        ))}
    </svg>
  );
}
