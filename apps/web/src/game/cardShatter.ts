/* A deleted card breaks apart into its own art (`Effects.cs:1693-1788`). The
   reference client does not swap the card for a generic puff: it cuts the card
   image into shards and throws them, which is why the deletion still reads as
   *that* Digimon leaving the field.

   This module cuts the card rectangle into wedges around its centre and gives
   each one the direction and spin it flies off in. The renderer clips one copy of
   the card art per wedge, so the shards carry the art with them.

   Pure geometry, seeded by index alone so a shard always flies the same way. */

export interface CardShard {
  /** CSS `polygon()` points, in percentages of the card box. */
  clipPath: string;
  /** Where the shard ends up, as a fraction of the card's own width/height. */
  driftX: number;
  driftY: number;
  spinDeg: number;
  /** Stagger, so the card comes apart rather than exploding as one frame. */
  delayMs: number;
}

/** Wedges the card is cut into. Six reads as breakage; more reads as dust. */
export const CARD_SHARD_COUNT = 6;

/** Stagger between one shard leaving and the next, so the card comes apart in order. */
export const CARD_SHARD_STAGGER_MS = 18;

/** How long after the first shard the last one starts, which every window has to allow for. */
export const CARD_SHARD_SPREAD_MS = (CARD_SHARD_COUNT - 1) * CARD_SHARD_STAGGER_MS;

/** How far a shard travels, in card widths. */
const SHARD_DRIFT = 0.62;

/** Deterministic spread so a shard's spin does not repeat the one beside it. */
const SPINS = [-152, 118, 96, -134, 168, -88] as const;

function point(angle: number): { x: number; y: number } {
  // Cast each wedge edge out from the centre far enough to clear the corners, then
  // let the polygon clamp handle the rest: the card box clips anything past it.
  const x = 50 + Math.cos(angle) * 120;
  const y = 50 + Math.sin(angle) * 120;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

/**
 * The shards a card breaks into. Each is a wedge from the card's centre out
 * through the edge, so together they tile the whole card with no gap.
 */
export function cardShards(count: number = CARD_SHARD_COUNT): CardShard[] {
  const shards: CardShard[] = [];
  const step = (Math.PI * 2) / count;
  for (let index = 0; index < count; index += 1) {
    const start = index * step - Math.PI / 2;
    const end = start + step;
    const mid = start + step / 2;
    const from = point(start);
    const to = point(end);
    const between = point(mid);
    shards.push({
      clipPath: `polygon(50% 50%, ${from.x}% ${from.y}%, ${between.x}% ${between.y}%, ${to.x}% ${to.y}%)`,
      driftX: Math.round(Math.cos(mid) * SHARD_DRIFT * 1000) / 1000,
      driftY: Math.round(Math.sin(mid) * SHARD_DRIFT * 1000) / 1000,
      spinDeg: SPINS[index % SPINS.length]!,
      delayMs: index * CARD_SHARD_STAGGER_MS,
    });
  }
  return shards;
}
