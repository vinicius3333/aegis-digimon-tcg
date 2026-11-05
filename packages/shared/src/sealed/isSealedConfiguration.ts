import { findBoosterProduct } from "#shared/packOpening/findBoosterProduct";
import { isSealedProductAvailable } from "#shared/sealed/isSealedProductAvailable";
import { GameRulesPolicy } from "#shared/sealed/GameRulesPolicy";
import type { SealedConfiguration } from "#shared/sealed/SealedContracts";

export function isSealedConfiguration(value: unknown): value is SealedConfiguration {
  if (!value || typeof value !== "object") {
    return false;
  }
  const config = value as Partial<SealedConfiguration>;
  const product = findBoosterProduct(config.setId);
  return (
    !!product &&
    isSealedProductAvailable({ product }) &&
    config.packs === 6 &&
    config.collationVersion === product.collationVersion &&
    config.catalogVersion === product.catalogVersion &&
    config.rulesVersion === GameRulesPolicy.SEALED.value &&
    typeof config.buildMinutes === "number" &&
    Number.isInteger(config.buildMinutes) &&
    config.buildMinutes >= 1 &&
    config.buildMinutes <= 120 &&
    typeof config.sideboardSeconds === "number" &&
    Number.isInteger(config.sideboardSeconds) &&
    config.sideboardSeconds >= 30 &&
    config.sideboardSeconds <= 300
  );
}
