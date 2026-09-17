/** Stars in the entrance halo; each one is placed and delayed by its position in game.css. */
const SPARKLE_INDEXES = [0, 1, 2, 3, 4];

/** The sparkle burst a permanent plays on entering the board and on every digivolution. */
export function PermanentSparkles() {
  return (
    <span className="game-card-sparkles" aria-hidden="true">
      {SPARKLE_INDEXES.map((i) => (
        <span key={i} className="game-card-sparkle" />
      ))}
    </span>
  );
}
