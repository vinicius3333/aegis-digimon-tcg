import type { CardInstance, Seat } from "@aegis/shared";

/**
 * Security-stack manipulation: reorder, move and flip cards in a security
 * stack without checking them.
 */
export interface SecurityPrimitives {
  /** Shuffle a seat's security stack in place (uniform). */
  shuffleSecurity(seat: Seat): void;
  /** Publicly reveal one chosen card without exposing the rest of its private zone. */
  revealCard(seat: Seat, cardId: string, sourceCardId?: string): void;
  /** Move `n` of a seat's security cards (from top or bottom), or explicit security instances, to its owner's hand. */
  securityToHand(seat: Seat, n: number, opts?: { fromTop?: boolean; instanceIds?: string[] }): Promise<CardInstance[]>;
  /**
   * ＜Recovery +N (Deck)＞: move the top `n` cards of a seat's deck onto the TOP of its
   * security stack (face-down). Hard-capped so the stack never exceeds 5 cards: at 5
   * already in security the move is a no-op (KB EX2-018 Q3304). Returns the cards moved
   * (fewer if the deck runs out or the 5-card cap is reached).
   */
  recoverToSecurity(seat: Seat, n: number): Promise<CardInstance[]>;
  /**
   * Flip a seat's top FACE-UP security card face down (the "by flipping your top
   * face-up security card face down" prevention cost). Returns true when a card was
   * flipped, false when there was no face-up security card.
   */
  flipTopSecurity(seat: Seat): boolean;
  /**
   * Flip a seat's top FACE-DOWN security card FACE UP (EX11-064's "flip your opponent's
   * top face-down security card face up"). Scans from the top of the stack and flips the
   * first face-down card; the card stays in security but is now revealed to both players
   * (a shuffle re-hides it). Returns true when a card was flipped, false when there was
   * no face-down security card. `fromTop` (default) scans from index 0.
   */
  flipSecurityFaceUp(seat: Seat, opts?: { fromTop?: boolean }): boolean;
  flipSecurityFaceDown?(seat: Seat, instanceId: string): boolean;
}
