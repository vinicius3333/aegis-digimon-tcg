import type { CardInstance, Seat } from "@aegis/shared";

/**
 * A face-down card under a permanent is hidden information, but its owner may freely look
 * at it (Comprehensive Rules §4-7-10). The owner check is not redundant with the server's
 * redaction: a Colyseus view never takes back an identity it already sent, so an opponent
 * who saw the card face up before it was placed face down still holds its `cardId`.
 */
export function readableStackCardIdentity(
  card: CardInstance,
  viewerSeat: Seat | undefined,
): { cardId: string; artId?: string } {
  if (!card.faceUp && card.ownerSeat !== viewerSeat) return { cardId: "" };
  return { cardId: card.cardId ?? "", artId: card.artId };
}
