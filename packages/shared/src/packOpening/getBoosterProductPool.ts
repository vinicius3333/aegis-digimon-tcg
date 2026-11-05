import { getCardDefinition } from "#shared/cards/registry";
import { getCardArts } from "#shared/cards/arts";
import type { BoosterProduct } from "#shared/packOpening/BoosterProduct";
import type { PackCard } from "#shared/packOpening/PackCard";
import { findPackRarity } from "#shared/packOpening/findPackRarity";

export function getBoosterProductPool(product: BoosterProduct): PackCard[] {
  return product.printings.map((printing) => {
    const card = getCardDefinition(printing.cardId);
    if (
      !card ||
      card.isToken ||
      card.maxCountInDeck <= 0 ||
      !findPackRarity(printing.rarity) ||
      (printing.artId && !getCardArts(card.cardId).some((art) => art.artId === printing.artId))
    ) {
      throw new Error("sealed_product_incomplete");
    }
    return { ...card, rarity: printing.rarity, ...(printing.artId ? { artId: printing.artId } : {}) };
  });
}
