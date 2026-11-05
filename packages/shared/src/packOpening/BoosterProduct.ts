import type { BoosterProductUnavailableReason } from "#shared/packOpening/BoosterProductUnavailableReason";

export type BoosterPrinting = {
  cardId: string;
  rarity: string;
  artId?: string;
};

export type BoosterProduct = {
  name: string;
  value: string;
  label: string;
  coverUrl: string;
  region: "English/world";
  releaseDate: string;
  cardsPerPack: number;
  packsPerBox: number;
  officialTypes: number;
  specialTypes: number;
  catalogVersion: string;
  collationVersion: string;
  sourceUrl: string;
  cardListUrl: string;
  retrievedAt: string;
  sourceHash: string;
  cardListHash: string;
  unavailableReason?: BoosterProductUnavailableReason;
  printings: readonly BoosterPrinting[];
};
