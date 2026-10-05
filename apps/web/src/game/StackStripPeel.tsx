import type { ColorName } from "../design/theme";
import { burstPalette } from "./showcases";

/** The source-removal vignette is a black face with a card-coloured selection rim. */
export function StackStripPeel({ color }: { color: ColorName }) {
  return (
    <span className="game-stack-strip-peel__sway">
      <svg viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
        <rect className="game-stack-strip-peel__face" width="100" height="140" rx="9" fill="#000" />
        <rect
          className="game-stack-strip-peel__rim"
          x="1.5"
          y="1.5"
          width="97"
          height="137"
          rx="8"
          fill="none"
          stroke={burstPalette("evolve", color).edge}
          strokeWidth="3"
        />
      </svg>
    </span>
  );
}
