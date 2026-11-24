import { getCardDefinition } from "#shared/cards/registry";
import { CardKind } from "#shared/schema/enums";

type Params = { mainDeck: readonly string[]; eggDeck: readonly string[] };

export function validateSealedDeckShape({ mainDeck, eggDeck }: Params): { ok: true } | { ok: false; reason: string } {
  if (mainDeck.length !== 40 || eggDeck.length > 5) {
    return { ok: false, reason: "sealed_deck_size" };
  }
  for (const [zone, cards] of [mainDeck, eggDeck].entries()) {
    for (const cardId of cards) {
      const card = getCardDefinition(cardId);
      if (!card || card.isToken || card.kinds.includes(CardKind.DigiEgg) !== (zone === 1)) {
        return { ok: false, reason: "sealed_card_zone" };
      }
    }
  }
  return { ok: true };
}
