import { useEffect, useRef, useState } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import {
  advanceOpponentFeed,
  emptyOpponentFeedState,
  enqueueOpponentActions,
  opponentActionFromEvent,
  type OpponentFeedState,
} from "./opponentActionFeed";

interface UseOpponentActionFeedOptions {
  events: readonly ServerEvent[];
  viewerSeat: Seat;
  paused: boolean;
  trailCapacity: number;
  matchKey: string;
}

interface FeedClock {
  itemId?: string;
  remainingMs: number;
}

export function useOpponentActionFeed({
  events,
  viewerSeat,
  paused,
  trailCapacity,
  matchKey,
}: UseOpponentActionFeedOptions): OpponentFeedState {
  const [state, setState] = useState<OpponentFeedState>(emptyOpponentFeedState);
  const initializedRef = useRef(false);
  const previousEventSignaturesRef = useRef<string[]>([]);
  const sequenceRef = useRef(0);
  const clockRef = useRef<FeedClock>({ remainingMs: 0 });

  useEffect(() => {
    initializedRef.current = false;
    previousEventSignaturesRef.current = [];
    sequenceRef.current = 0;
    clockRef.current = { remainingMs: 0 };
    setState(emptyOpponentFeedState());
  }, [matchKey]);

  useEffect(() => {
    const signatures = events.map((event) => JSON.stringify(event));
    if (!initializedRef.current) {
      initializedRef.current = true;
      previousEventSignaturesRef.current = signatures;
      return;
    }

    const previous = previousEventSignaturesRef.current;
    let overlap = Math.min(previous.length, signatures.length);
    while (
      overlap > 0
      && !previous.slice(-overlap).every((signature, index) => signature === signatures[index])
    ) {
      overlap -= 1;
    }
    previousEventSignaturesRef.current = signatures;
    // A completely different non-empty log is a reconnect/history refresh. It has no
    // reliable event IDs, so establish the new baseline instead of replaying history.
    if (previous.length > 0 && overlap === 0) return;
    const fresh = events.slice(overlap);
    const items = fresh.flatMap((event) => {
      sequenceRef.current += 1;
      const item = opponentActionFromEvent(
        event,
        viewerSeat,
        `${matchKey}:${sequenceRef.current}`,
      );
      return item ? [item] : [];
    });
    if (items.length > 0) setState((current) => enqueueOpponentActions(current, items, trailCapacity));
  }, [events, matchKey, trailCapacity, viewerSeat]);

  useEffect(() => {
    const current = state.current;
    if (!current) {
      clockRef.current = { remainingMs: 0 };
      return;
    }
    if (clockRef.current.itemId !== current.id) {
      clockRef.current = { itemId: current.id, remainingMs: current.durationMs };
    }
    if (paused) return;

    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      clockRef.current = { remainingMs: 0 };
      setState((feed) => advanceOpponentFeed(feed, trailCapacity));
    }, clockRef.current.remainingMs);

    return () => {
      window.clearTimeout(timer);
      if (clockRef.current.itemId === current.id) {
        clockRef.current.remainingMs = Math.max(
          0,
          clockRef.current.remainingMs - (Date.now() - startedAt),
        );
      }
    };
  }, [paused, state.current?.id, trailCapacity]);

  return state;
}
