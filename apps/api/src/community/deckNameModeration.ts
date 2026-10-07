import { COMMUNITY_DECK_NAME_MAX } from "@aegis/shared";
import { hasBlockedWord } from "../moderation/blockedWords.js";

export type DeckNameReview = { allowed: true; name: string } | { allowed: false };

/** The public form of a deck name, or a refusal when it is empty or contains a blocked word. */
export function reviewDeckName(raw: string): DeckNameReview {
  const name = raw.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, COMMUNITY_DECK_NAME_MAX).trim();
  if (name.length === 0 || hasBlockedWord(name)) return { allowed: false };
  return { allowed: true, name };
}
