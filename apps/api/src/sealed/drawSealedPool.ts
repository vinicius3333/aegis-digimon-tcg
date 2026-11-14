import { getCompiledCard } from "@aegis/shared/effects/data";
import { findBoosterProduct } from "@aegis/shared/packOpening/findBoosterProduct";
import { getBoosterProductPool } from "@aegis/shared/packOpening/getBoosterProductPool";
import { getEffectModule } from "#api/engine/effects/registry";
import "#api/cards/index";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardKind } from "@aegis/shared/schema/enums";
import { randomInt } from "node:crypto";
import { drawBoosterPack } from "@aegis/shared/packOpening/drawBoosterPack";
import { isSealedConfiguration } from "@aegis/shared/sealed/isSealedConfiguration";
import type { SealedConfiguration, SealedPull } from "@aegis/shared/sealed/SealedContracts";

type Params = { configuration: SealedConfiguration; random?: () => number };

export function drawSealedPool({
  configuration,
  random = () => randomInt(0x100000000) / 0x100000000,
}: Params): SealedPull[][] {
  if (!isSealedConfiguration(configuration)) {
    throw new Error("sealed_configuration_invalid");
  }
  const product = findBoosterProduct(configuration.setId)!;
  const cards = getBoosterProductPool(product);
  if (
    cards.some((card) => {
      const compiled = getCompiledCard(card.cardId);
      return (
        Boolean(
          card.effectText ||
          card.inheritedEffectText ||
          card.securityEffectText ||
          card.linkEffect ||
          card.dualEffect ||
          card.optionEffect,
        ) &&
        (!getEffectModule(card.cardId) || compiled?.coverage !== "full" || compiled.residual.length > 0)
      );
    }) ||
    !["C", "U", "R", "SR"].every((rarity) => cards.some((card) => card.rarity === rarity))
  ) {
    throw new Error("sealed_product_unavailable");
  }
  const packs = Array.from({ length: configuration.packs }, () =>
    drawBoosterPack({ setId: configuration.setId, cards, random }).map((card) => ({
      cardId: card.cardId,
      ...(card.artId ? { artId: card.artId } : {}),
    })),
  );
  if (packs.some((pack) => pack.length !== product.cardsPerPack)) {
    throw new Error("sealed_collation_incomplete");
  }
  if (packs.flat().filter((pull) => !getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg)).length < 40) {
    throw new Error("sealed_pool_insufficient_main");
  }
  return packs;
}
