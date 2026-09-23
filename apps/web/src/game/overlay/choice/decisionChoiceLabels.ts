import type { Translate, TranslationKey } from "../../../i18n";

/*
   The choices a `chooseOption` decision names are the engine's own words for where a card
   goes — the destination keys `RevealAdd` builds its prompt from, and the two deck ends an
   ordering asks about. Printed straight, a Zenith-style "add it or play it" prompt offered
   buttons reading "hand" and "play"; each one gets the sentence a player would recognise.
*/
const CHOICE_LABEL_KEYS: Readonly<Record<string, TranslationKey>> = {
  top: "overlay.deckTop",
  bottom: "overlay.deckBottom",
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

export function choiceLabel({ choice, t }: { choice: string; t: Translate }): string {
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
