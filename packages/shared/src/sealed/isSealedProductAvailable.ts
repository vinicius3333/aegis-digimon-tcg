import { getBoosterProductPool } from "#shared/packOpening/getBoosterProductPool";
import type { BoosterProduct } from "#shared/packOpening/BoosterProduct";
import { CardKind } from "#shared/schema/enums";
import { PackRarity } from "#shared/packOpening/PackRarity";

type Params = { product: BoosterProduct; asOf?: string };

export function isSealedProductAvailable({ product, asOf = new Date().toISOString().slice(0, 10) }: Params): boolean {
  if (product.unavailableReason || product.releaseDate > asOf || product.cardsPerPack !== 12) {
    return false;
  }
  try {
    const cards = getBoosterProductPool(product);
    const common = cards.filter((card) => card.rarity === PackRarity.COMMON.value);
    const uncommon = cards.filter((card) => card.rarity === PackRarity.UNCOMMON.value);
    const rare = cards.filter((card) => card.rarity === PackRarity.RARE.value);
    return (
      common.length >= 7 &&
      uncommon.length >= 3 &&
      rare.length >= 2 &&
      cards.filter((card) => !card.kinds.includes(CardKind.DigiEgg)).length >= 40 &&
      new Set(cards.map((card) => card.cardId)).size === cards.length
    );
  } catch {
    return false;
  }
}
