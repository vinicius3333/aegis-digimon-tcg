import { listSealedProducts } from "@aegis/shared/sealed/listSealedProducts";
import { getBoosterProductPool } from "@aegis/shared/packOpening/getBoosterProductPool";
import type { PackCard } from "@aegis/shared/packOpening/PackCard";

export interface BoosterSet {
  setId: string;
  label: string;
  coverUrl: string;
  cards: PackCard[];
}

export function listBoosterSets(): BoosterSet[] {
  return listSealedProducts().map((product) => ({
    setId: product.value,
    label: product.label,
    coverUrl: product.coverUrl,
    cards: getBoosterProductPool(product),
  }));
}
