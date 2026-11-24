import { getCardDefinition } from "#shared/cards/registry";
import { CardKind } from "#shared/schema/enums";
import type { SealedDeck, SealedPull } from "#shared/sealed/SealedContracts";

type Params = {
  pool: readonly SealedPull[];
  mainDeck: readonly string[];
  eggDeck: readonly string[];
};
type Result = ({ ok: true; sideboard: SealedPull[] } & SealedDeck) | { ok: false; reason: string };

export function validateSealedDeck({ pool, mainDeck, eggDeck }: Params): Result {
  if (mainDeck.length !== 40 || eggDeck.length > 5) {
    return { ok: false, reason: "sealed_deck_size" };
  }
  const remaining = [...pool];
  const canonical: string[][] = [[], []];
  for (const [zone, cards] of [mainDeck, eggDeck].entries()) {
    for (const printing of cards) {
      const index = remaining.findIndex((pull) => (pull.artId ?? pull.cardId) === printing);
      if (index < 0) {
        return { ok: false, reason: "sealed_card_not_owned" };
      }
      const pull = remaining[index]!;
      const card = getCardDefinition(pull.cardId);
      if (!card || card.isToken || card.kinds.includes(CardKind.DigiEgg) !== (zone === 1)) {
        return { ok: false, reason: "sealed_card_zone" };
      }
      canonical[zone]!.push(pull.cardId);
      remaining.splice(index, 1);
    }
  }
  return {
    ok: true,
    mainDeck: canonical[0]!,
    eggDeck: canonical[1]!,
    mainDeckArts: [...mainDeck],
    eggDeckArts: [...eggDeck],
    sideboard: remaining,
  };
}
