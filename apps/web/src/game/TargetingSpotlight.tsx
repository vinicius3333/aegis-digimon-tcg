/* The mask a board-answered target prompt drops over the field: the board goes
   dark except for the cards the server offered, each of which keeps a hole of its
   own. The reference client's `HideCannotSelectObject`, which paints a 47%-black
   panel and punches one card-sized rect per legal target.

   The overlay never takes a pointer event — the lit cards underneath are exactly
   the things the player has to be able to click, so the mask has
   `pointer-events: none` and the holes are a drawing, not a hit area. */

import { spotlightHoles, type SpotlightSubject } from "./spotlight";

/** Every hole is cut from one full-board rect, so the mask needs a stable id. */
const MASK_ID = "aegis-targeting-spotlight";

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
  // Nothing measured means nothing to light, and a mask with no holes would black
  // the board out entirely — so it simply does not render.
  if (holes.length === 0 || width <= 0 || height <= 0) return null;
  return (
    <svg
      className="game-spotlight"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={MASK_ID}>
          <rect x={0} y={0} width={width} height={height} fill="#fff" />
          {holes.map((hole) => (
            <rect
              key={hole.id}
              x={hole.x}
              y={hole.y}
              width={hole.width}
              height={hole.height}
              rx={hole.radius}
              fill="#000"
            />
          ))}
        </mask>
      </defs>
      <rect x={0} y={0} width={width} height={height} className="game-spotlight__scrim" mask={`url(#${MASK_ID})`} />
      {holes.map((hole) => (
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
