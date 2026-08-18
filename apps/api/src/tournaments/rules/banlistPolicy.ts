import {
  banlistAsOf,
  getCardDefinition,
  pairPartners,
  releaseDateForSet,
  type BanlistPolicy,
  type TournamentBanlistCard,
} from "@aegis/shared";

/**
 * Resolves a `BanlistPolicy` to the concrete card list frozen onto a tournament at creation.
 *
 * The set→release-date table is the one the card pool already owns (`PRODUCT_RELEASES` in
 * `packages/shared/src/cards/cardPool.ts`, exposed as `releaseDateForSet`); no second table is
 * introduced, so a set can never be legal for the pool and unknown to the banlist at the same time.
 */

export class UnknownBanlistSetError extends Error {
  constructor(readonly setId: string) {
    super(`unknown set ${setId}`);
  }
}

/** The date a `current` policy resolves at, as the `YYYY-MM-DD` string `banlistAsOf` expects. */
export function banlistDateOf(createdAt: number): string {
  return new Date(createdAt).toISOString().slice(0, 10);
}

/** The canonical spelling of a set id, so `bt7` and `BT7` freeze one identical policy. */
export function normalizeSetId(setId: string): string {
  return setId.trim().toUpperCase();
}

/**
 * The release date of the collection a `as_of_set` policy names, or undefined when the set has no
 * verified date — including `P`, whose promos release per card rather than as one product.
 */
export function banlistDateForSet(setId: string): string | undefined {
  return releaseDateForSet(normalizeSetId(setId));
}

/** The policy as it is frozen on the tournament: same meaning, one canonical spelling. */
export function normalizeBanlistPolicy(policy: BanlistPolicy): BanlistPolicy {
  return policy.mode === "as_of_set" ? { mode: "as_of_set", setId: normalizeSetId(policy.setId) } : policy;
}

/**
 * The restrictions in force under `policy`, sorted by card id so the frozen snapshot is byte-stable.
 * Throws {@link UnknownBanlistSetError} for an `as_of_set` policy naming a set we have no date for;
 * callers that need a reason code instead should validate the policy first.
 */
export function resolveBanlistPolicy(policy: BanlistPolicy, createdAt: number): TournamentBanlistCard[] {
  if (policy.mode === "none") return [];
  const asOf = policy.mode === "current" ? banlistDateOf(createdAt) : banlistDateForSet(policy.setId);
  if (asOf === undefined) throw new UnknownBanlistSetError((policy as { setId: string }).setId);
  return Object.values(banlistAsOf(asOf))
    .map((entry) => frozenCard(entry.cardId, entry.status, entry.count, asOf))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
}

/**
 * A banned-pair card is legal on its own up to its printed limit — only the combination is illegal —
 * so it keeps the full cap and carries the partners in force at the frozen date. Deck validation
 * reads this snapshot and never the live pair table, so a pair added later cannot retroactively make
 * an already-created event's decks illegal.
 */
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
