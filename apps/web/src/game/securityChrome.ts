/* What a security stack says about itself (`SecurityObject.cs`): a badge when it
   holds a card that has been turned face-up, and — while it is a legal thing to
   attack — the label for what attacking it would actually be. The reference client
   distinguishes the two: a stack with cards left is a Security Attack, an empty
   one is a Direct Attack, and the count is public information on both sides.

   Pure: the caller decides when a stack is a candidate target, this decides what
   the stack then says. */

import type { CardInstance } from "@aegis/shared";

export type SecurityAttackLabelKey = "game.securityAttack" | "game.directAttack";

/**
 * What attacking this stack would be. An empty stack is attacked directly — the
 * check finds nothing to flip — while any remaining card makes it a security
 * attack. Only the count is read, which every viewer already has.
 */
export function securityAttackLabelKey(securityCount: number): SecurityAttackLabelKey {
  return securityCount > 0 ? "game.securityAttack" : "game.directAttack";
}

/**
 * Whether a stack is holding a card the opponent can see. The engine re-exposes an
 * individual security card to the other seat's view when it is turned face-up, so
 * a stack the viewer can read identities out of is a stack with face-up cards in
 * it — no rule is being reconstructed, only the visibility the server granted.
 */
export function hasFaceUpSecurity(cards: readonly CardInstance[] | undefined): boolean {
  return (cards ?? []).some((card) => card?.faceUp === true && Boolean(card.cardId));
}
