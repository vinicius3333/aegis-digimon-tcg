import type { BoosterSet } from "@/packOpening/listBoosterSets";
import { getPackCardRarity } from "@aegis/shared/packOpening/getPackCardRarity";
import { listPackAlternateArts } from "@aegis/shared/packOpening/listPackAlternateArts";
import type { PackCard } from "@aegis/shared/packOpening/PackCard";

export function listBoosterSetCards(boosterSet: BoosterSet): PackCard[] {
  const { setId, cards } = boosterSet;
  return [
    ...cards.map((card) => ({ ...card, rarity: getPackCardRarity({ card, setId }) })),
    ...listPackAlternateArts({ cards, setId }),
  ];
}
