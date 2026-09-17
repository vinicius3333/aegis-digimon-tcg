/** How many pieces the security pane breaks into. */
const SHIELD_SHARD_COUNT = 6;

/** How far the middle shard is thrown, in pixels. */
const SHIELD_SHARD_REACH = 34;

/** Deterministic 0..1 from a break's seed and a shard's place in the ring. */
function shardNoise(seed: number, index: number): number {
  const value = Math.sin((seed + 1) * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * How this break throws its shards. The ring keeps every break balanced; the seed — the
 * check's own key — jitters the angle, the reach and the spin, so two checks in a row do
 * not shatter into the same frame (battle-animation-spec.md §4b).
 */
export function buildShieldShards(seed: number): readonly { x: number; y: number; spin: number }[] {
  return Array.from({ length: SHIELD_SHARD_COUNT }, (_, index) => {
    const noise = shardNoise(seed, index);
    const angle = ((index + 0.5 + (noise - 0.5) * 0.7) / SHIELD_SHARD_COUNT) * Math.PI * 2;
    const reach = SHIELD_SHARD_REACH * (0.62 + noise * 0.6);
    return {
      x: Math.round(Math.cos(angle) * reach),
      y: Math.round(Math.sin(angle) * reach),
      spin: Math.round(75 + noise * 110) * (index % 2 === 0 ? -1 : 1),
    };
  });
}
