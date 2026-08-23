/**
 * Browser-compatible banlist restriction lookups. The authoritative source is
 * `data/kb/banlist.json`; its event history is replicated here so the
 * web client can enforce limits without a server round-trip.
 *
 * Restrictions are resolved **at a date**, not "latest wins": the default date is
 * today, while callers can still query historical formats explicitly. A restriction
 * starts applying on its effective date and stays in force until a later lift.
 *
 * Keep in sync with banlist.json `events`. Regenerate with:
 *   node -e "const b=require('./data/kb/banlist.json'); console.log(JSON.stringify(b.events))"
 */

import { getCardDefinition } from "./cards/registry.js";

export type RestrictionStatus = "restricted" | "banned" | "banned_pair";

export interface BanlistEntry {
  cardId: string;
  name: string;
  status: RestrictionStatus;
  count: number;
  effectiveDate: string;
}

interface BanlistEvent extends BanlistEntry {
  action: "restrict" | "lift";
}

/**
 * Every restriction event, oldest first, replicated from `banlist.json` `events`.
 * The list is the history, not a snapshot: the effective banlist is resolved for a
 * date. The default is today, so the latest restrictions published by the official
 * banlist apply even while the card pool itself is historical.
 */
const BANLIST_EVENTS: readonly BanlistEvent[] = [
  {
    cardId: "BT2-047",
    name: "Argomon",
    status: "restricted",
    count: 1,
    effectiveDate: "2021-04-01",
    action: "restrict",
  },
  {
    cardId: "BT3-103",
    name: "Hidden Potential Discovered!",
    status: "restricted",
    count: 1,
    effectiveDate: "2021-04-01",
    action: "restrict",
  },
  {
    cardId: "BT6-015",
    name: "SaviorHuckmon",
    status: "restricted",
    count: 1,
    effectiveDate: "2021-04-01",
    action: "restrict",
  },
  {
    cardId: "BT7-072",
    name: "Eyesmon",
    status: "restricted",
    count: 1,
    effectiveDate: "2021-04-01",
    action: "restrict",
  },
  {
    cardId: "BT5-109",
    name: "Mega Digimon Fusion!",
    status: "banned",
    count: 0,
    effectiveDate: "2022-02-25",
    action: "restrict",
  },
  {
    cardId: "BT6-100",
    name: "Reinforcing Memory Boost!",
    status: "restricted",
    count: 1,
    effectiveDate: "2022-02-25",
    action: "restrict",
  },
  {
    cardId: "EX1-068",
    name: "Ice Wall!",
    status: "restricted",
    count: 1,
    effectiveDate: "2022-02-25",
    action: "restrict",
  },
  {
    cardId: "BT7-038",
    name: "JetSilphymon",
    status: "restricted",
    count: 1,
    effectiveDate: "2022-08-01",
    action: "restrict",
  },
  {
    cardId: "BT7-086",
    name: "Tommy Himi",
    status: "restricted",
    count: 1,
    effectiveDate: "2022-08-01",
    action: "restrict",
  },
  {
    cardId: "BT10-009",
    name: "Shoutmon X4",
    status: "restricted",
    count: 1,
    effectiveDate: "2022-11-11",
    action: "restrict",
  },
  {
    cardId: "BT7-064",
    name: "DoruGreymon",
    status: "restricted",
    count: 1,
    effectiveDate: "2022-11-11",
    action: "restrict",
  },
  {
    cardId: "BT7-107",
    name: "Calling From the Darkness",
    status: "restricted",
    count: 1,
    effectiveDate: "2022-11-11",
    action: "restrict",
  },
  {
    cardId: "BT9-099",
    name: "Sunrise Buster",
    status: "restricted",
    count: 1,
    effectiveDate: "2022-11-11",
    action: "restrict",
  },
  {
    cardId: "BT11-064",
    name: "Greymon (X Antibody)",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-04-01",
    action: "restrict",
  },
  {
    cardId: "BT3-054",
    name: "Blossomon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-06-01",
    action: "restrict",
  },
  {
    cardId: "EX2-039",
    name: "Impmon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-06-01",
    action: "restrict",
  },
  {
    cardId: "P-008",
    name: "WereGarurumon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-06-01",
    action: "restrict",
  },
  {
    cardId: "P-025",
    name: "GranKuwagamon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-06-01",
    action: "restrict",
  },
  {
    cardId: "BT13-012",
    name: "GeoGreymon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-11-17",
    action: "restrict",
  },
  {
    cardId: "BT2-069",
    name: "Gabumon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-11-17",
    action: "restrict",
  },
  {
    cardId: "BT6-015",
    name: "SaviorHuckmon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-11-17",
    action: "lift",
  },
  {
    cardId: "BT7-069",
    name: "Eyesmon: Scatter Mode",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-11-17",
    action: "restrict",
  },
  {
    cardId: "BT7-086",
    name: "Tommy Himi",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-11-17",
    action: "lift",
  },
  {
    cardId: "EX4-019",
    name: "MachGaogamon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-11-17",
    action: "restrict",
  },
  {
    cardId: "ST6-03",
    name: "Gabumon",
    status: "restricted",
    count: 1,
    effectiveDate: "2023-11-17",
    action: "restrict",
  },
  {
    cardId: "BT14-002",
    name: "Bukamon",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-03-01",
    action: "restrict",
  },
  {
    cardId: "BT15-102",
    name: "Apocalymon",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-03-01",
    action: "restrict",
  },
  {
    cardId: "EX5-015",
    name: "Gabumon (X Antibody)",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-03-01",
    action: "restrict",
  },
  {
    cardId: "EX5-018",
    name: "Garurumon (X Antibody)",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-03-01",
    action: "restrict",
  },
  {
    cardId: "EX5-062",
    name: "Anubismon",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-03-01",
    action: "restrict",
  },
  {
    cardId: "BT14-084",
    name: "T.K. Takaishi",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-08-31",
    action: "restrict",
  },
  {
    cardId: "BT15-057",
    name: "Numemon (X Antibody)",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-08-31",
    action: "restrict",
  },
  {
    cardId: "BT9-098",
    name: "Awakening of the Golden Knight",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-08-31",
    action: "restrict",
  },
  { cardId: "P-123", name: "Ukkomon", status: "restricted", count: 1, effectiveDate: "2024-08-31", action: "restrict" },
  {
    cardId: "P-130",
    name: "Lui Ohwada",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-08-31",
    action: "restrict",
  },
  {
    cardId: "ST2-13",
    name: "Hammer Spark",
    status: "restricted",
    count: 1,
    effectiveDate: "2024-08-31",
    action: "restrict",
  },
  { cardId: "ST6-03", name: "Gabumon", status: "restricted", count: 1, effectiveDate: "2024-08-31", action: "lift" },
  {
    cardId: "BT11-033",
    name: "Mirage Gaogamon",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "BT17-069",
    name: "Fenriloogamon",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "BT2-090",
    name: "Matt Ishida",
    status: "banned",
    count: 0,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "BT4-104",
    name: "Blinding Ray",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "BT4-111",
    name: "Jack Raid",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "EX2-007",
    name: "Mother D-Reaper",
    status: "banned_pair",
    count: 0,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "EX4-030",
    name: "Kuzuhamon",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "EX7-064",
    name: "Shoto Kazama",
    status: "banned_pair",
    count: 0,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "ST9-09",
    name: "Stingmon",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-03-28",
    action: "restrict",
  },
  {
    cardId: "BT1-090",
    name: "Gravity Crush",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "BT13-110",
    name: "Royal Knights of the Purge",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "BT16-011",
    name: "Garudamon (X Antibody)",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "BT19-040",
    name: "Sakuyamon",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "BT20-037",
    name: "Chaosmon: Valdur Arm",
    status: "banned_pair",
    count: 0,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "BT6-104",
    name: "Parabolic Junk",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "EX1-021",
    name: "Metal Garurumon",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "EX2-070",
    name: "Digivolution Plug-In S",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "EX3-057",
    name: "Growlmon",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "EX4-006",
    name: "Guilmon",
    status: "restricted",
    count: 1,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "EX5-065",
    name: "Sayo & Koh",
    status: "banned",
    count: 0,
    effectiveDate: "2025-09-01",
    action: "restrict",
  },
  {
    cardId: "BT10-080",
    name: "SkullBaluchimon",
    status: "restricted",
    count: 1,
    effectiveDate: "2026-04-04",
    action: "restrict",
  },
  {
    cardId: "BT23-032",
    name: "Shakkoumon",
    status: "restricted",
    count: 1,
    effectiveDate: "2026-04-04",
    action: "restrict",
  },
  {
    cardId: "BT3-092",
    name: "MaloMyotismon",
    status: "restricted",
    count: 1,
    effectiveDate: "2026-04-04",
    action: "restrict",
  },
  {
    cardId: "BT9-099",
    name: "Sunrise Buster",
    status: "restricted",
    count: 1,
    effectiveDate: "2026-04-04",
    action: "lift",
  },
  {
    cardId: "EX4-019",
    name: "MachGaogamon",
    status: "restricted",
    count: 1,
    effectiveDate: "2026-04-04",
    action: "lift",
  },
  {
    cardId: "EX5-059",
    name: "Dobermon (X Antibody)",
    status: "restricted",
    count: 1,
    effectiveDate: "2026-04-04",
    action: "restrict",
  },
  {
    cardId: "EX5-061",
    name: "Cerberusmon (X Antibody)",
    status: "restricted",
    count: 1,
    effectiveDate: "2026-04-04",
    action: "restrict",
  },
];

/**
 * The date the banlist is read at: today's date in UTC. This keeps deck validation
 * aligned with the current official banlist instead of the card pool cutoff.
 */
export const BANLIST_AS_OF_DATE: string = new Date().toISOString().slice(0, 10);

/** The active restrictions on `asOf`, with later events and lifts folded in. */
export function banlistAsOf(asOf: string = BANLIST_AS_OF_DATE): Readonly<Record<string, BanlistEntry>> {
  const latestByCard = new Map<string, BanlistEvent>();
  for (const event of BANLIST_EVENTS) {
    if (event.effectiveDate > asOf) continue;
    const prior = latestByCard.get(event.cardId);
    if (prior === undefined || event.effectiveDate >= prior.effectiveDate) {
      latestByCard.set(event.cardId, event);
    }
  }
  const active: Record<string, BanlistEntry> = {};
  for (const [cardId, event] of latestByCard) {
    if (event.action === "lift") continue;
    active[cardId] = {
      cardId,
      name: event.name,
      status: event.status,
      count: event.count,
      effectiveDate: event.effectiveDate,
    };
  }
  return Object.freeze(active);
}

/** The restrictions in force under the current official banlist. */
export const banlistCurrent: Readonly<Record<string, BanlistEntry>> = banlistAsOf();

/**
 * Banned pairs: `cardId` may not share a deck with any card in `conflictsWith`.
 * Each card is legal on its own, up to its normal copy limit — only the
 * combination is illegal, and only from `effectiveDate` on.
 *
 * Transcribed from the "Banned Pairs" table on
 * https://world.digimoncard.com/rule/restriction_card/ (the scraped
 * `banlist.json` records the status but not the partner linkage).
 */
export const BANNED_PAIRS: ReadonlyArray<
  Readonly<{ cardId: string; conflictsWith: readonly string[]; effectiveDate: string }>
> = [
  { cardId: "BT20-037", conflictsWith: ["BT17-035", "EX8-037"], effectiveDate: "2025-09-01" }, // Chaosmon: Valdur Arm
  { cardId: "EX2-007", conflictsWith: ["EX7-064"], effectiveDate: "2025-03-28" }, // Mother D-Reaper / Shoto Kazama
];

function pairsInForce(asOf: string): typeof BANNED_PAIRS {
  return BANNED_PAIRS.filter((pair) => pair.effectiveDate <= asOf);
}

/** Every card that may not share a deck with `cardId` (the relation is symmetric). */
export function pairPartners(cardId: string, asOf: string = BANLIST_AS_OF_DATE): string[] {
  const partners = new Set<string>();
  for (const pair of pairsInForce(asOf)) {
    if (pair.cardId === cardId) for (const other of pair.conflictsWith) partners.add(other);
    else if (pair.conflictsWith.includes(cardId)) partners.add(pair.cardId);
  }
  return [...partners];
}

/** Whether any banned pair could involve this card at all (deck contents decide legality). */
export function hasPairRestriction(cardId: string, asOf: string = BANLIST_AS_OF_DATE): boolean {
  return pairPartners(cardId, asOf).length > 0;
}

/** The banned pairs a card list actually contains, as `[cardId, partnerCardId]`. */
export function bannedPairViolations(
  cardIds: readonly string[],
  asOf: string = BANLIST_AS_OF_DATE,
): Array<[string, string]> {
  const present = new Set(cardIds);
  const violations: Array<[string, string]> = [];
  for (const pair of pairsInForce(asOf)) {
    if (!present.has(pair.cardId)) continue;
    for (const other of pair.conflictsWith) {
      if (present.has(other)) violations.push([pair.cardId, other]);
    }
  }
  return violations;
}

export function getBanlistEntry(cardId: string): BanlistEntry | undefined {
  return banlistCurrent[cardId];
}

/** Outright banned. Banned-pair cards are legal alone — see {@link bannedPairViolations}. */
export function isBanned(cardId: string): boolean {
  return banlistCurrent[cardId]?.status === "banned";
}

export function isRestricted(cardId: string): boolean {
  return banlistCurrent[cardId]?.status === "restricted";
}

/**
 * The effective copy limit for a card, accounting for banlist restrictions and the
 * card's own maxCountInDeck (usually 4, but higher for cards like Vemmon BT11-061
 * that explicitly allow up to 50 copies). Banlist restrictions always lower the cap;
 * they never raise it above the card's printed limit.
 */
export function effectiveCopyLimit(cardId: string): number {
  const printedCap = getCardDefinition(cardId)?.maxCountInDeck ?? 4;
  const entry = banlistCurrent[cardId];
  // banned_pair carries count 0, but the card is only illegal next to its partner.
  if (entry === undefined || entry.status === "banned_pair") return printedCap;
  return entry.count;
}

/**
 * Human-readable restriction label for display, or undefined if unrestricted.
 * Banned-pair cards get no label here: whether they are legal depends on the rest
 * of the deck, so the deck view labels them instead.
 */
export function restrictionLabel(cardId: string): string | undefined {
  const entry = banlistCurrent[cardId];
  if (!entry) return undefined;
  switch (entry.status) {
    case "banned":
      return "BANNED";
    case "banned_pair":
      return undefined;
    case "restricted":
      return "LIMIT 1";
  }
}
