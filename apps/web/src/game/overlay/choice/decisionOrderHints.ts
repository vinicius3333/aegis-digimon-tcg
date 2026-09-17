import type { TranslationKey } from "../../../i18n";

/** One hint per destination: each already says where card 1 ends up. */
export function orderHintKey(destination: string | undefined): TranslationKey {
  if (destination === "stackBottom") return "overlay.orderStackBottomHint";
  if (destination === "deckBottom") return "overlay.orderDeckBottomHint";
  return "overlay.orderCardsHint";
}
