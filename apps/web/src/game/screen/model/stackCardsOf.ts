import type { Permanent, Seat } from "@aegis/shared";
import type { StackCard } from "../../overlay";
import { readableStackCardIdentity } from "../../stackCardIdentity";

/** Flatten a permanent into its [active, digivolution…, linked…] cards for the modal. */
export function stackCardsOf(input: { perm: Permanent; viewerSeat: Seat | undefined }): StackCard[] {
  const { perm, viewerSeat } = input;
  const cards: StackCard[] = [];
  if (perm.topCard?.cardId) cards.push({ cardId: perm.topCard.cardId, artId: perm.topCard.artId, role: "top" });
  for (const ci of perm.stack)
    cards.push({ ...readableStackCardIdentity(ci, viewerSeat), faceDown: !ci.faceUp, role: "stack" });
  for (const ci of perm.linked) cards.push({ cardId: ci.cardId, artId: ci.artId, role: "linked" });
  return cards;
}
