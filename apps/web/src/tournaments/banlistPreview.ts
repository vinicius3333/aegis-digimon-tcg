/* Client-side preview of the list a `BanlistPolicy` will freeze onto a tournament.

   This is a mirror of `resolveBanlistPolicy` in `apps/api/src/tournaments/rules/banlistPolicy.ts`
   and reads the same `@aegis/shared` banlist history, so the preview and the frozen snapshot agree.
   It is a preview only: the server resolves the policy again at its own clock and its answer is
   what the event actually carries. */

import {
  activeProductLabels,
  banlistAsOf,
  getCardDefinition,
  pairPartners,
  releaseDateForSet,
  type BanlistPolicy,
  type TournamentBanlistCard,
} from "@aegis/shared";

export type BanlistPreview =
  | { kind: "unrestricted" }
  | { kind: "unknown_set"; setId: string }
  | { kind: "resolved"; asOf: string; cards: TournamentBanlistCard[] };

/** The set ids offered for an `as_of_set` policy, newest release first. */
export function banlistSetOptions(): string[] {
  return [...activeProductLabels()].reverse();
}

function normalizeSetId(setId: string): string {
  return setId.trim().toUpperCase();
}

export function previewBanlist(policy: BanlistPolicy, now: number = Date.now()): BanlistPreview {
  if (policy.mode === "none") return { kind: "unrestricted" };
  if (policy.mode === "current") return resolved(new Date(now).toISOString().slice(0, 10));
  const asOf = releaseDateForSet(normalizeSetId(policy.setId));
  return asOf === undefined ? { kind: "unknown_set", setId: policy.setId } : resolved(asOf);
}

function resolved(asOf: string): BanlistPreview {
  const cards = Object.values(banlistAsOf(asOf))
    .map((entry) => frozenCard(entry.cardId, entry.status, entry.count, asOf))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
  return { kind: "resolved", asOf, cards };
}

/** The card's printed name, falling back to its id when the pool has no definition for it. */
export function banlistCardName(cardId: string): string {
  return getCardDefinition(cardId)?.nameEn ?? cardId;
}

function frozenCard(
  cardId: string,
  status: TournamentBanlistCard["status"],
  count: number,
  asOf: string,
): TournamentBanlistCard {
  if (status !== "banned_pair") return { cardId, status, allowedCopies: count };
  return {
    cardId,
    status,
    allowedCopies: getCardDefinition(cardId)?.maxCountInDeck ?? 4,
    pairPartnerIds: pairPartners(cardId, asOf).sort(),
  };
}
