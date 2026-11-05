import type { CardDefinition } from "#shared/cards/types";
import { getPackPullRates } from "#shared/packOpening/getPackPullRates";
import { PackRarity } from "#shared/packOpening/PackRarity";

type Params = {
  card: CardDefinition;
  setId: string;
};

export function getPackCardRarity({ card, setId }: Params): string | undefined {
  if (card.rarity === PackRarity.ULTRA_RARE.value && getPackPullRates({ setId }).ultimateRare === 0) {
    return PackRarity.SECRET_RARE.value;
  }
  return card.rarity;
}
