import { findBoosterProduct } from "#shared/packOpening/findBoosterProduct";
import { isSealedProductAvailable } from "#shared/sealed/isSealedProductAvailable";
import { GameRulesPolicy } from "#shared/sealed/GameRulesPolicy";
import type { SealedConfiguration } from "#shared/sealed/SealedContracts";

type Params = { setId: string; buildMinutes?: number; sideboardSeconds?: number };

export function getSealedConfiguration({
  setId,
  buildMinutes = 30,
  sideboardSeconds = 120,
}: Params): SealedConfiguration {
  const product = findBoosterProduct(setId);
  if (!product || !isSealedProductAvailable({ product })) {
    throw new Error("sealed_product_unavailable");
  }
  return {
    setId,
    packs: 6,
    collationVersion: product.collationVersion,
    catalogVersion: product.catalogVersion,
    rulesVersion: GameRulesPolicy.SEALED.value,
    buildMinutes,
    sideboardSeconds,
  };
}
