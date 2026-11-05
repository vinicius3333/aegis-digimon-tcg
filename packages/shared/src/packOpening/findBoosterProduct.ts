import { boosterProducts } from "#shared/packOpening/boosterProducts";
import type { BoosterProduct } from "#shared/packOpening/BoosterProduct";

export function findBoosterProduct(value: unknown): BoosterProduct | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return boosterProducts.find((product) => product.value === value);
}
