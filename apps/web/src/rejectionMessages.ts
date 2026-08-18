import type { RejectReason } from "@aegis/shared";
import type { Translate, TranslationKey } from "./i18n";

/**
 * Translation key per RejectReason code. Typed as Record<RejectReason, …> so a
 * future union addition is a compile error until a message is provided.
 */
const REJECTION_KEYS: Record<RejectReason, TranslationKey> = {
  // Generic
  "not-your-turn": "reject.not-your-turn",
  "wrong-phase": "reject.wrong-phase",
  "decision-pending": "reject.decision-pending",
  "illegal-target": "reject.illegal-target",
  "insufficient-memory": "reject.insufficient-memory",
  "card-not-in-zone": "reject.card-not-in-zone",
  "no-such-card": "reject.no-such-card",
  "not-implemented": "reject.not-implemented",
  "unknown-intent": "reject.unknown-intent",

  // Play / DigiXros
  "not-playable-kind": "reject.not-playable-kind",
  "no-empty-slot": "reject.no-empty-slot",
  "play-prohibited": "reject.play-prohibited",
  "color-requirement-unmet": "reject.color-requirement-unmet",
  "not-digixros": "reject.not-digixros",
  "not-assembly": "reject.not-assembly",
  "no-materials": "reject.no-materials",
  "invalid-material": "reject.invalid-material",
  "invalid-expander": "reject.invalid-expander",

  // Digivolve
  "invalid-evolution": "reject.invalid-evolution",
  "no-such-permanent": "reject.no-such-permanent",
  "not-controller": "reject.not-controller",
  "not-a-digimon": "reject.not-a-digimon",

  // Breeding
  "breeding-occupied": "reject.breeding-occupied",
  "egg-deck-empty": "reject.egg-deck-empty",
  "breeding-empty": "reject.breeding-empty",
  "not-movable": "reject.not-movable",
  "move-prohibited": "reject.move-prohibited",

  // Link
  "not-linkable": "reject.not-linkable",
  "link-requirement-unmet": "reject.link-requirement-unmet",
};

/**
 * Returns a human-readable flash message for an intent rejection. Falls back to
 * the raw string for any unrecognised runtime value (e.g. a client-side hint or
 * an error message from the async continuation path).
 */
export function rejectionMessage(reason: string, t: Translate): string {
  const key = (REJECTION_KEYS as Record<string, TranslationKey | undefined>)[reason];
  return key ? t(key) : reason;
}
