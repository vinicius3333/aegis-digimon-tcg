import type { Permanent } from "@aegis/shared";
import type { StackCard } from "../../overlay";

/** Flatten a permanent into its [active, digivolution…, linked…] cards for the modal. */
export function stackCardsOf(input: { perm: Permanent }): StackCard[] {
  const { perm } = input;
  const cards: StackCard[] = [];
  if (perm.topCard?.cardId) cards.push({ cardId: perm.topCard.cardId, artId: perm.topCard.artId, role: "top" });
  for (const ci of perm.stack)
    cards.push({
      cardId: ci.faceUp ? ci.cardId : "",
      artId: ci.faceUp ? ci.artId : undefined,
      faceDown: !ci.faceUp,
      role: "stack",
    });
  for (const ci of perm.linked) cards.push({ cardId: ci.cardId, artId: ci.artId, role: "linked" });
  return cards;
}
