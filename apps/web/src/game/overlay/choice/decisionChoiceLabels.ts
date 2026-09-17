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

export function choiceLabel({ choice, t }: { choice: string; t: Translate }): string {
  const key = CHOICE_LABEL_KEYS[choice];
  // Anything the server has not been taught a label for still reads: the raw
  // choice is the fallback, so a new disposition ships as a plain word rather
  // than as a blank button.
  return key === undefined ? choice : t(key);
}
