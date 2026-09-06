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

/** The crack overlay's drawing box: a card's aspect, in the same units the shards use. */
export const CARD_CRACK_VIEWBOX = { width: 100, height: 140 } as const;

/** How far along a crack each branch forks off, as fractions of the run to the edge. */
const CRACK_BRANCH_AT = [0.42, 0.7] as const;

/** Branch length in card widths and the angle each leaves its crack at, alternating sides. */
const CRACK_BRANCH_LENGTH = 0.16;

const CRACK_BRANCH_ANGLE = 0.62;

/** A slight bend per crack so the pane reads as glass rather than as a ruled wheel. */
const CRACK_BENDS = [0.09, -0.07, 0.11, -0.1, 0.06, -0.12] as const;

function crackPoint(angle: number, reach: number): { x: number; y: number } {
  return {
    x: Math.round((50 + Math.cos(angle) * reach) * 100) / 100,
    y: Math.round((70 + Math.sin(angle) * reach * 1.4) * 100) / 100,
  };
}

/**
 * The cracks a card shows the beat before its shards leave: one along every wedge edge,
 * each with a bend and two short forks, all radiating from the impact at the centre of
 * the card. They follow the shard seams exactly, so the shards fly apart along the lines
 * the viewer has just seen open. Returned as SVG path data over {@link CARD_CRACK_VIEWBOX}.
 */
export function cardCrackPaths(count: number = CARD_SHARD_COUNT): string[] {
  const step = (Math.PI * 2) / count;
  const paths: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = index * step - Math.PI / 2;
    const bend = CRACK_BENDS[index % CRACK_BENDS.length]!;
    const origin = crackPoint(angle, 0);
    const knee = crackPoint(angle + bend, 55);
    const edge = crackPoint(angle, 120);
    paths.push(`M${origin.x} ${origin.y} L${knee.x} ${knee.y} L${edge.x} ${edge.y}`);
    CRACK_BRANCH_AT.forEach((at, branchIndex) => {
      const side = (index + branchIndex) % 2 === 0 ? 1 : -1;
      const fork = crackPoint(angle + bend * (1 - at), 120 * at);
      const tip = crackPoint(angle + side * CRACK_BRANCH_ANGLE, 120 * at + CRACK_BRANCH_LENGTH * 100);
      paths.push(`M${fork.x} ${fork.y} L${tip.x} ${tip.y}`);
    });
  }
  return paths;
}
