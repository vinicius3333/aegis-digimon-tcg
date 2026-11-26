import { isDeckFormat, type DeckFormat } from "@aegis/shared/deckFormat";
import { deckFormatPreferenceKey } from "@/screens/deckFormatPreferenceKey";

export function loadDeckFormatPreference(): DeckFormat | undefined {
  try {
    const saved = localStorage.getItem(deckFormatPreferenceKey);
    return isDeckFormat(saved) ? saved : undefined;
  } catch {
    return undefined;
  }
}
