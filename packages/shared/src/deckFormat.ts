import { banlistAsOf, BANLIST_AS_OF_DATE, bannedPairViolations } from "./banlist.js";
import { allProductLabels, releaseDateForCard, releaseDateForSet } from "./cards/cardPool.js";
import { getCardDefinition } from "./cards/registry.js";

/** Set formats snapshot the English card pool and banlist on the product's release date. */
export type DeckFormat = "standard" | "unlimited" | "pauper" | `${"BT" | "EX" | "ST" | "RB" | "AD"}${number}`;

export function historicalDeckFormats(asOf = BANLIST_AS_OF_DATE): DeckFormat[] {
  return allProductLabels().filter(
    (id) => /^(BT|EX|ST|RB|AD)\d+$/.test(id) && releaseDateForSet(id)! <= asOf,
  ) as DeckFormat[];
}

export function isDeckFormat(value: unknown): value is DeckFormat {
  return (
    value === "standard" ||
    value === "unlimited" ||
    value === "pauper" ||
    (typeof value === "string" && historicalDeckFormats().includes(value as DeckFormat))
  );
}

/** Old decks and clients have no format field. */
export function deckFormat(value: unknown, unlimited = false): DeckFormat {
  return isDeckFormat(value) ? value : unlimited ? "unlimited" : "standard";
}

export function formatBanlistDate(format: DeckFormat): string {
  return releaseDateForSet(format) ?? BANLIST_AS_OF_DATE;
}

const formatBanlists = new Map<string, ReturnType<typeof banlistAsOf>>();

export function formatCopyLimit(cardId: string, format: DeckFormat): number {
  const printed = getCardDefinition(cardId)?.maxCountInDeck ?? 4;
  if (format === "unlimited") return printed;
  const date = formatBanlistDate(format);
  let list = formatBanlists.get(date);
  if (!list) {
    list = banlistAsOf(date);
    formatBanlists.set(date, list);
  }
  const entry = list[cardId];
  return entry === undefined || entry.status === "banned_pair" ? printed : Math.min(printed, entry.count);
}

/** Rarity comes from the base card definition; cosmetic artwork cannot change legality. */
export function formatCardViolation(cardId: string, format: DeckFormat): string | undefined {
  const card = getCardDefinition(cardId);
  if (!card) return `unknown card: ${cardId}`;
  if (card.isToken || card.maxCountInDeck === 0) return `${cardId} cannot be included in a deck`;
  if (format === "pauper" && card.rarity !== "C" && card.rarity !== "U")
    return `${cardId} is not Common or Uncommon (Pauper allows C/U only)`;
  const cutoff = releaseDateForSet(format);
  if (cutoff !== undefined) {
    // LM combines many products under one id; its date is explicitly unverified.
    const released = card.set === "LM" ? undefined : releaseDateForCard(card);
    if (released === undefined || released > cutoff)
      return `${cardId} is outside the ${format} card pool (through ${cutoff})`;
  }
  return undefined;
}

export function formatRestrictionLabel(cardId: string, format: DeckFormat): string | undefined {
  if (formatCardViolation(cardId, format)) return "OUTSIDE FORMAT";
  const cap = formatCopyLimit(cardId, format);
  if (cap === 0) return "BANNED";
  if (cap < (getCardDefinition(cardId)?.maxCountInDeck ?? 4)) return `LIMIT ${cap}`;
  return undefined;
}

export function formatPairViolations(cardIds: readonly string[], format: DeckFormat): [string, string][] {
  return format === "unlimited" ? [] : bannedPairViolations(cardIds, formatBanlistDate(format));
}
