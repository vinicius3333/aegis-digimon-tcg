/**
 * Join payload sent to client.joinOrCreate(ROOM_TYPE, options). Mirrors
 * AegisJoinOptions declared on the server room (API-CONTRACT.md section 1). The
 * web package may not import @aegis/api, so the shape is restated here; both sides
 * must agree on it.
 */
export interface AegisJoinOptions {
  displayName: string;
  deck: { mainDeck: string[]; eggDeck: string[] }; // arrays of card ids
  deckId?: string;
  deckName?: string;
  ranked?: boolean;
  authTicket?: string;
}
