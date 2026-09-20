/* A position whose ORIGINAL card information an effect rewrote — BT11-043 KingSukamon,
   BT14-097's security effect and EX13-031 all turn one of the opponent's Digimon into a
   white 3000 DP Digimon whose original name is [Sukamon].

   Nothing enters the field when this happens: the physical card stays where it is and only
   what it COUNTS AS changes (KB Q2080). The board therefore keeps rendering the real card and
   lays a token over it, the way players mark the change in paper with an overlay card.

   Pure projection over a `Permanent`; every figure is server truth (`originalNameOverride`,
   `originalColorsOverride`, `originalDPOverride`), re-derived by the engine each continuous-recompute
   pass from the same ledger entry the rules read. No rules here. */

import { CardColor } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";

export interface PermanentTransformation {
  /** The original name the effect imposed, e.g. "Sukamon". */
  name: string;
  /** The original colors the effect imposed; empty when only the name changed. */
  colors: readonly CardColor[];
  /** The original DP the effect imposed. */
  dp: number;
  /** Card whose art stands in for the token, when we have one for this name. */
  tokenArtCardId?: string;
}

/**
 * Art we lend a transformed position. Bandai prints no token card for these effects — players
 * use fan-made overlays — so the token wears the art of a real printing of that Digimon, taken
 * from the same image source every other card on the board uses.
 */
const TOKEN_ART_BY_NAME: Readonly<Record<string, string>> = {
  sukamon: "BT11-040",
};

/** What this position currently counts as, or undefined while nothing overrode it. */
export function permanentTransformation(permanent: Permanent): PermanentTransformation | undefined {
  const name = permanent.originalNameOverride ?? "";
  // The ledger stores the colour as a plain string; only the ones the game knows are kept,
  // so every consumer here can treat them as CardColor without a cast at the far end.
  const known = new Set<string>(Object.values(CardColor));
  const colors = [...(permanent.originalColorsOverride ?? [])].filter((color): color is CardColor => known.has(color));
  if (!name && colors.length === 0) return undefined;
  const tokenArtCardId = TOKEN_ART_BY_NAME[name.toLowerCase()];
  return {
    name,
    colors,
    dp: permanent.originalDPOverride || permanent.currentDP,
    ...(tokenArtCardId ? { tokenArtCardId } : {}),
  };
}
