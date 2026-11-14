import type { SealedPull } from "@aegis/shared/sealed/SealedContracts";

type Params = { packs: readonly (readonly SealedPull[])[] };

export function getSealedPoolManifest({ packs }: Params): string {
  return JSON.stringify(
    packs.map((pack) => pack.map((pull) => ({ cardId: pull.cardId, artId: pull.artId ?? pull.cardId }))),
  );
}
