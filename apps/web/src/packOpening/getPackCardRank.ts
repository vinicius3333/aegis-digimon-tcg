import type { PackCard } from "@aegis/shared/packOpening/PackCard";
import { findPackRarity } from "@aegis/shared/packOpening/findPackRarity";
import { PackRarity } from "@aegis/shared/packOpening/PackRarity";

const RARITY_ORDER: string[] = [
  PackRarity.COMMON.value,
  PackRarity.UNCOMMON.value,
  PackRarity.RARE.value,
  PackRarity.SUPER_RARE.value,
  PackRarity.ULTRA_RARE.value,
  PackRarity.SECRET_RARE.value,
];

export function getPackCardRank(card: PackCard): number {
  return (
    RARITY_ORDER.indexOf(findPackRarity(card.rarity)?.value ?? PackRarity.COMMON.value) +
    (card.artId ? RARITY_ORDER.length : 0)
  );
}
