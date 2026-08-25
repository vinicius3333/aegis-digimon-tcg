/* The three badges a permanent wears for as long as it stands there, rather than
   for the length of a cue: the ＜Blocker＞ shield, the `×N` digivolution-source
   count, and the DP chip a dual-colour Digimon splits between its two colours.

   Server truth throughout. The shield reads `Permanent.keywords`, which the
   engine re-derives on every continuous-effect pass and therefore already
   includes a Blocker a card only has because something granted it — the printed
   text on the art is not consulted. The stack count is the synchronized stack's
   own length, and the colours are card data.

   Pure: this module answers what the badges say, `boardPieces.tsx` draws them. */

import { getCardDefinition, type Permanent } from "@aegis/shared";
import { colorKey, palettePairFor, type ColorName } from "../design/theme";

/**
 * The keyword name the engine projects for ＜Blocker＞. Compared against
 * `Permanent.keywords` exactly as projected — the normalized spelling is the
 * contract, and `formatKeyword` only exists to print it.
 */
export const BLOCKER_KEYWORD = "Blocker";

/** Whether this permanent can block right now, as the server resolved it. */
export function hasBlocker(permanent: Pick<Permanent, "keywords">): boolean {
  return [...permanent.keywords].includes(BLOCKER_KEYWORD);
}

export interface SourceCountBadge {
  /** How many digivolution cards sit under the top card. */
  count: number;
  /** Palette key of the top card's first colour, which tints the badge. */
  color: ColorName;
}

/**
 * The `×N` badge, or null when nothing is stacked underneath. Tinted by the TOP
 * card rather than by the card at the bottom of the stack: the badge belongs to
 * the Digimon standing there now.
 */
export function sourceCountBadge(permanent: Pick<Permanent, "stack" | "topCard">): SourceCountBadge | null {
  const count = permanent.stack.length;
  if (count === 0) return null;
  const topId = permanent.topCard?.cardId;
  return { count, color: colorKey(getCardDefinition(topId ?? "")?.colors[0]) };
}

/**
 * The two ends of the DP chip's gradient. A single-colour Digimon returns the
 * same colour twice, so the chip is drawn one way for every card and simply
 * stops splitting when there is nothing to split.
 */
export interface DpChipColors {
  from: string;
  to: string;
  /** True when the card really carries two distinct printed colours. */
  split: boolean;
}

/** The DP chip's colours for a permanent's top card. */
export function dpChipColors(permanent: Pick<Permanent, "topCard">): DpChipColors {
  const pair = palettePairFor(getCardDefinition(permanent.topCard?.cardId ?? "")?.colors);
  return { from: pair.from.base, to: pair.to.base, split: pair.split };
}
