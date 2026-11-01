import type { Express } from "express";
import { matchMaker } from "colyseus";
import { deckFormat } from "@aegis/shared/deckFormat";
import { matchBestOf } from "@aegis/shared/matchFormat";
import { MatchQueue } from "@aegis/shared/matchmaking/MatchQueue";
import {
  MATCH_QUEUE_COUNTS_PATH,
  type MatchQueueCount,
  type MatchQueueCounts,
} from "@aegis/shared/matchmaking/MatchQueueCounts";
import { getMatchQueueKey } from "@aegis/shared/matchmaking/getMatchQueueKey";
import { ROOM_TYPE, ROOM_TYPE_BETA, ROOM_TYPE_MANUAL, ROOM_TYPE_UNLIMITED } from "@aegis/shared/protocol/messages";
import type { RankedSearcherCount } from "#api/ranked/countRankedSearchers";

type Params = {
  app: Express;
  countRankedSearchers?: () => Promise<RankedSearcherCount[]>;
  now?: () => number;
};

type WaitingRoomListing = {
  name: string;
  locked?: boolean;
  private?: boolean;
  clients?: number;
  format?: unknown;
  unlimited?: unknown;
  matchTimer?: unknown;
  bestOf?: unknown;
  allowRollback?: unknown;
  metadata?: { format?: unknown; unlimited?: unknown };
};

const MATCH_QUEUE_COUNTS_CACHE_MILLISECONDS = 5_000;

const QUEUE_BY_ROOM_TYPE = new Map<string, MatchQueue>([
  [ROOM_TYPE, MatchQueue.CASUAL.value],
  [ROOM_TYPE_UNLIMITED, MatchQueue.UNLIMITED.value],
  [ROOM_TYPE_BETA, MatchQueue.BETA.value],
  [ROOM_TYPE_MANUAL, MatchQueue.MANUAL.value],
]);

function isWaitingForOpponent(listing: WaitingRoomListing): boolean {
  return listing.locked !== true && listing.private !== true && listing.clients === 1;
}

function getWaitingRoomBucket(listing: WaitingRoomListing, queue: MatchQueue): MatchQueueCount {
  return {
    queue,
    format: deckFormat(
      listing.format ?? listing.metadata?.format,
      listing.unlimited === true || listing.metadata?.unlimited === true,
    ),
    matchTimer: listing.matchTimer === true,
    bestOf: matchBestOf(listing.bestOf),
    allowRollback: listing.allowRollback === true,
    searching: 1,
  };
}

function getRankedBucket({ format, searching }: RankedSearcherCount): MatchQueueCount {
  return {
    queue: MatchQueue.RANKED.value,
    format,
    matchTimer: true,
    bestOf: 1,
    allowRollback: false,
    searching,
  };
}

async function countRankedBuckets(countRankedSearchers: Params["countRankedSearchers"]): Promise<MatchQueueCount[]> {
  if (!countRankedSearchers) {
    return [];
  }
  try {
    return (await countRankedSearchers()).filter(({ searching }) => searching > 0).map(getRankedBucket);
  } catch {
    return [];
  }
}

async function countMatchQueues(countRankedSearchers: Params["countRankedSearchers"]): Promise<MatchQueueCounts> {
  const [listings, rankedBuckets] = await Promise.all([
    matchMaker.query({}) as Promise<WaitingRoomListing[]>,
    countRankedBuckets(countRankedSearchers),
  ]);
  const buckets = new Map<string, MatchQueueCount>();
  for (const listing of listings) {
    const queue = QUEUE_BY_ROOM_TYPE.get(listing.name);
    if (!queue || !isWaitingForOpponent(listing)) {
      continue;
    }
    const bucket = getWaitingRoomBucket(listing, queue);
    const key = getMatchQueueKey(bucket);
    const existing = buckets.get(key);
    buckets.set(key, existing ? { ...existing, searching: existing.searching + 1 } : bucket);
  }
  return { buckets: [...buckets.values(), ...rankedBuckets] };
}

export function installMatchQueueRoutes({ app, countRankedSearchers, now = Date.now }: Params): void {
  let cached: { expiresAt: number; counts: Promise<MatchQueueCounts> } | undefined;
  function getCounts(): Promise<MatchQueueCounts> {
    if (cached && cached.expiresAt > now()) {
      return cached.counts;
    }
    const counts = countMatchQueues(countRankedSearchers);
    cached = { expiresAt: now() + MATCH_QUEUE_COUNTS_CACHE_MILLISECONDS, counts };
    counts.catch(() => {
      if (cached?.counts === counts) {
        cached = undefined;
      }
    });
    return counts;
  }
  app.get(MATCH_QUEUE_COUNTS_PATH, async (_req, res) => {
    try {
      res.json(await getCounts());
    } catch {
      res.status(503).json({ error: "Queue counts are unavailable" });
    }
  });
}
