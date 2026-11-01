import { useEffect, useState } from "react";
import type { MatchQueueCounts } from "@aegis/shared/matchmaking/MatchQueueCounts";
import { matchQueueCounts } from "@/net/client";

const REFRESH_INTERVAL_MS = 10_000;

type Params = {
  load?: () => Promise<MatchQueueCounts>;
};

export function useMatchQueueCounts({ load = matchQueueCounts }: Params = {}): MatchQueueCounts | undefined {
  const [counts, setCounts] = useState<MatchQueueCounts>();
  useEffect(() => {
    let mounted = true;
    function refresh() {
      void load()
        .then((next) => {
          if (mounted) {
            setCounts(next);
          }
        })
        .catch(() => {
          if (mounted) {
            setCounts(undefined);
          }
        });
    }
    refresh();
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        refresh();
      }
    }, REFRESH_INTERVAL_MS);
    function onVisibilityChange() {
      if (!document.hidden) {
        refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load]);
  return counts;
}
