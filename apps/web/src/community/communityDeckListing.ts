import type { CommunityDeck } from "@aegis/shared";
import { colorKey } from "../design/theme";
import type { DeckListing } from "../game/decks";

const COMMUNITY_ID_PREFIX = "community-";

/** A public deck as the lobby and the deck tools read it. The id never collides with a saved deck. */
export function communityDeckListing(deck: CommunityDeck): DeckListing {
  return {
    id: `${COMMUNITY_ID_PREFIX}${deck.id}`,
    name: deck.name,
    color: colorKey(deck.colors[0]),
    blurb: deck.author.displayName,
    mainDeck: [...deck.mainDeck],
    eggDeck: [...deck.eggDeck],
    mainDeckArts: [...deck.mainDeckArts],
    eggDeckArts: [...deck.eggDeckArts],
    coverCardId: deck.coverCardId ?? undefined,
  };
}

/** Browse tiles carry no card list, so they get a cover-only listing for the shared tile. */
export function communityTileListing(
  deck: Omit<CommunityDeck, "mainDeck" | "eggDeck" | "mainDeckArts" | "eggDeckArts">,
): DeckListing {
  return {
    id: `${COMMUNITY_ID_PREFIX}${deck.id}`,
    name: deck.name,
    color: colorKey(deck.colors[0]),
    blurb: deck.author.displayName,
    mainDeck: [],
    eggDeck: [],
    coverCardId: deck.coverCardId ?? undefined,
  };
}
