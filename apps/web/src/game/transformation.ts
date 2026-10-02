/* A position whose ORIGINAL card information an effect rewrote — BT11-043 KingSukamon,
   BT14-097's security effect and EX13-031 all turn one of the opponent's Digimon into a
   white 3000 DP Digimon whose original name is [Sukamon].

   Nothing enters the field when this happens: the physical card stays where it is and only
   what it COUNTS AS changes (KB Q2080). The board therefore keeps the real card's art and
   restates the imposed name, color and DP in its info strip.

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
}

/**
 * The DP that `+N`/`−N` badges measure against. `baseDP` stays the physical card's printed DP,
 * so an active original-DP change (KingSukamon's 3000) must replace it as the baseline.
 */
export function originalDP(permanent: Pick<Permanent, "baseDP" | "originalDPOverride">): number {
  return permanent.originalDPOverride || permanent.baseDP;
}

/** What this position currently counts as, or undefined while nothing overrode it. */
export function permanentTransformation(permanent: Permanent): PermanentTransformation | undefined {
  const name = permanent.originalNameOverride ?? "";
  // The ledger stores the colour as a plain string; only the ones the game knows are kept,
  // so every consumer here can treat them as CardColor without a cast at the far end.
  const known = new Set<string>(Object.values(CardColor));
  const colors = [...(permanent.originalColorsOverride ?? [])].filter((color): color is CardColor => known.has(color));
  if (!name && colors.length === 0) return undefined;
  return { name, colors, dp: permanent.originalDPOverride || permanent.currentDP };
}
