import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BANLIST_AS_OF_DATE, getCardDefinition } from "@aegis/shared";

/**
 * Effective per-cardId copy caps derived from the rules knowledge base
 * (`data/kb/banlist.json`), the authoritative restriction source.
 *
 * `MaxCountInDeck` (usually 4, but higher for cards that allow more) unless an active
 * banlist restriction lowers it. We read the
 * raw `banlist.json` directly (single source of truth — a future scrape refresh is
 * picked up with no copy to keep in sync) and fold its event history as of
 * `BANLIST_AS_OF_DATE` (today): future-dated events are excluded, and among the
 * rest the latest event per cardId wins.
 * A `lift` action removes the restriction (cap returns to 4), regardless of the stale
 * `count` carried on the lift event; otherwise the event's `count` is the cap
 * (restricted -> its limit, banned -> 0).
 *
 * Banned pairs: `banned_pair` events carry `count: 0`, but such a card is illegal only
 * beside its partner, so its cap here stays the printed one. The partner linkage lives
 * in `@aegis/shared`'s `BANNED_PAIRS` (transcribed from the official restriction page,
 * which `banlist.json` does not capture) and is enforced in `deckValidation.ts`.
 */

export const DEFAULT_COPY_LIMIT = 4;

interface BanlistEvent {
  cardId: string;
  name: string;
  status: "restricted" | "banned" | "banned_pair";
  count: number;
  effectiveDate: string;
  action: "restrict" | "lift";
}

interface BanlistFile {
  events: BanlistEvent[];
}

function loadBanlistEvents(): BanlistEvent[] {
  // src/engine/ and dist/engine/ are at the same depth relative to repo root, so
  // this resolves identically under vitest (src) and the built server (dist).
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "..", "..", "..", "..", "data", "kb", "banlist.json");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as BanlistFile;
  return parsed.events;
}

function buildRestrictionMap(): Map<string, number> {
  const latestByCard = new Map<string, BanlistEvent>();
  for (const event of loadBanlistEvents()) {
    // Banlist restrictions apply through today; scheduled future events must wait
    // until their effective date.
    if (event.effectiveDate > BANLIST_AS_OF_DATE) continue;
    const prior = latestByCard.get(event.cardId);
    if (prior === undefined || event.effectiveDate > prior.effectiveDate) {
      latestByCard.set(event.cardId, event);
    }
  }

  const caps = new Map<string, number>();
  for (const [cardId, event] of latestByCard) {
    // A lift restores the card to the default cap; only store entries that actually
    // tighten the limit so the map carries no default-4 noise.
    if (event.action === "lift") continue;
    // A banned-pair card keeps its printed cap; only the pairing is illegal.
    if (event.status === "banned_pair") continue;
    caps.set(cardId, event.count);
  }
  return caps;
}

/** cardId -> active copy cap, only for cards a banlist restriction currently lowers. */
export const banlistRestrictionMap: ReadonlyMap<string, number> = buildRestrictionMap();

/**
 * The active copy cap for a cardId: the card's own `maxCountInDeck` (default 4, but
 * higher for cards that explicitly allow more — e.g. Vemmon BT11-061 at 50), lowered
 * by an active banlist restriction. Mirrors the client's
 * `min(maxCountInDeck, banlistLimit(...))`.
 */
export function effectiveCopyLimit(cardId: string): number {
  const printedCap = getCardDefinition(cardId)?.maxCountInDeck ?? DEFAULT_COPY_LIMIT;
  const restriction = banlistRestrictionMap.get(cardId);
  return restriction === undefined ? printedCap : Math.min(printedCap, restriction);
}
