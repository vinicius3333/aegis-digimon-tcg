import { useState } from "react";

/** Stars in the entrance halo; each one is placed and delayed by its position in game.css. */
const SPARKLE_INDEXES = [0, 1, 2, 3, 4];

/**
 * The sparkle burst a permanent plays on entering the board and on every digivolution.
 * The stars leave the DOM once the last one has played: each is a filtered element, and
 * a crowded board kept five of them per card long after they faded out.
 */
export function PermanentSparkles() {
  const [played, setPlayed] = useState(0);
  if (played >= SPARKLE_INDEXES.length) return null;
  return (
    <span
      className="game-card-sparkles"
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if ((event.target as HTMLElement).classList.contains("game-card-sparkle")) setPlayed((count) => count + 1);
      }}
    >
      {SPARKLE_INDEXES.map((i) => (
        <span key={i} className="game-card-sparkle" />
      ))}
    </span>
  );
}
