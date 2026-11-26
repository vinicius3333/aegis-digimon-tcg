export type SealedPull = { cardId: string; artId?: string };
export type SealedConfiguration = {
  setId: string;
  packs: 6;
  collationVersion: string;
  catalogVersion: string;
  rulesVersion: string;
  buildMinutes: number;
  sideboardSeconds: number;
};
export type SealedDeckInput = { mainDeck: string[]; eggDeck: string[]; revision: number };
export type SealedDeck = {
  mainDeck: string[];
  eggDeck: string[];
  mainDeckArts: string[];
  eggDeckArts: string[];
};
export type SealedOwnPool = {
  window: string | null;
  configuration: SealedConfiguration;
  packs: SealedPull[][];
  revision: number;
  deck: SealedDeckInput | null;
  ready: boolean;
  editable: boolean;
  deadlineAt: number | null;
};
