import type { DeckFormat } from "@aegis/shared/deckFormat";
import { deckFormatPreferenceKey } from "@/screens/deckFormatPreferenceKey";

export function saveDeckFormatPreference(format: DeckFormat): void {
  try {
    localStorage.setItem(deckFormatPreferenceKey, format);
  } catch {
    return;
  }
}
