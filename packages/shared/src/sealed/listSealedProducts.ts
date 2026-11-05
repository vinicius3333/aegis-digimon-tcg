import { boosterProducts } from "#shared/packOpening/boosterProducts";
import { isSealedProductAvailable } from "#shared/sealed/isSealedProductAvailable";
import type { BoosterProduct } from "#shared/packOpening/BoosterProduct";

type Params = { asOf?: string };

export function listSealedProducts({ asOf }: Params = {}): BoosterProduct[] {
  return boosterProducts.filter((product) => isSealedProductAvailable({ product, asOf }));
}
