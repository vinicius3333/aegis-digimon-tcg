import { createHash } from "node:crypto";
import type { FamousDecklist } from "@aegis/shared";

export type { BlockLabel, DeckEntry, MetaDeck } from "@aegis/shared";

/**
 * Content fingerprint of a list: sha256 over the sorted card ids. `deckVersion` is
 * authored and can drift from the cards; this cannot, so the legality suite pins
 * every version to its fingerprint and an unversioned edit fails loudly.
 */
export function deckFingerprint(decklist: FamousDecklist): string {
  const canonical = [...decklist.mainDeck].sort().join(",") + "|" + [...decklist.eggDeck].sort().join(",");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
