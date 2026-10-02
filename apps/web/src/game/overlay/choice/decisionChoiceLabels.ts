import type { DecisionRequest } from "@aegis/shared";
import type { Translate, TranslationKey } from "../../../i18n";

type TopBottomZone = NonNullable<NonNullable<DecisionRequest["options"]>["topBottomZone"]>;

/*
   "top" and "bottom" name the ends of the zone the decision carries. A decision without one
   predates the field and reads as the deck, as it always did.
*/
const TOP_BOTTOM_LABEL_KEYS: Readonly<Record<TopBottomZone, { top: TranslationKey; bottom: TranslationKey }>> = {
  deck: { top: "overlay.deckTop", bottom: "overlay.deckBottom" },
  digivolutionCards: { top: "overlay.digivolutionCardsTop", bottom: "overlay.digivolutionCardsBottom" },
  security: { top: "overlay.securityTop", bottom: "overlay.securityBottom" },
};

/*
   The choices a `chooseOption` decision names are the engine's own words for where a card
   goes — the destination keys `RevealAdd` builds its prompt from. Printed straight, a
   Zenith-style "add it or play it" prompt offered buttons reading "hand" and "play"; each
   one gets the sentence a player would recognise.
*/
const CHOICE_LABEL_KEYS: Readonly<Record<string, TranslationKey>> = {
  hand: "overlay.dispositionHand",
  play: "overlay.dispositionPlay",
  useOption: "overlay.dispositionUseOption",
  trash: "overlay.dispositionTrash",
  digivolve: "overlay.dispositionDigivolve",
  security: "overlay.dispositionSecurity",
  placeUnder: "overlay.dispositionPlaceUnder",
  underTamer: "overlay.dispositionUnderTamer",
};

/*
   An effect-driven digivolution whose target matches both its printed requirement and an
   alternate one asks which to pay for. The engine words both entries in English with the
   cost in parentheses; each is re-worded in the player's language with the same cost.
*/
const DIGIVOLUTION_REQUIREMENT_LABELS: readonly { pattern: RegExp; key: TranslationKey }[] = [
  { pattern: /^Printed digivolution requirement \(cost (-?\d+)\)$/, key: "overlay.digivolutionRequirementPrinted" },
  { pattern: /^Alternate digivolution requirement \(cost (-?\d+)\)$/, key: "overlay.digivolutionRequirementAlternate" },
];

export function choiceLabel({
  choice,
  t,
  topBottomZone = "deck",
}: {
  choice: string;
  t: Translate;
  topBottomZone?: TopBottomZone;
}): string {
  if (choice === "top" || choice === "bottom") return t(TOP_BOTTOM_LABEL_KEYS[topBottomZone][choice]);
  const key = CHOICE_LABEL_KEYS[choice];
  if (key !== undefined) return t(key);
  for (const { pattern, key: requirementKey } of DIGIVOLUTION_REQUIREMENT_LABELS) {
    const cost = choice.match(pattern)?.[1];
    if (cost !== undefined) return t(requirementKey, { cost });
  }
  // Anything the server has not been taught a label for still reads: the raw
  // choice is the fallback, so a new disposition ships as a plain word rather
  // than as a blank button.
  return choice;
}
