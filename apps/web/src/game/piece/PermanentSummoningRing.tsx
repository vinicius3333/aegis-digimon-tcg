import type { CSSProperties } from "react";

/** Stars orbiting a permanent that cannot attack yet, spaced evenly around the ellipse. */
const SUMMONING_STAR_INDEXES = [0, 1, 2, 3, 4, 5];

/**
 * The ring a summoning-sick permanent wears. Server truth
 * (`Permanent.summoningSick`): this Digimon entered the field this turn and has
 * no ＜Rush＞, so it cannot declare an attack yet.
 */
export function PermanentSummoningRing() {
  return (
    <span className="game-summoning-ring" aria-hidden="true">
      {SUMMONING_STAR_INDEXES.map((index) => (
        <i
          key={index}
          style={
            {
              "--star-index": index,
              offsetDistance: `${(index * 100) / SUMMONING_STAR_INDEXES.length}%`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
