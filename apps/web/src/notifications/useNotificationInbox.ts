import type { AccountNotification } from "@aegis/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationApiError, notificationApi } from "./client";

/** A minute is fast enough for triage news and cheap enough for every open tab. */
export const NOTIFICATION_POLL_MS = 60_000;
const CHANNEL = "aegis-notifications";

export type NotificationInbox = {
  unread: number;
  items: AccountNotification[];
  nextBefore: number | null;
  loading: boolean;
  failed: boolean;
  /** Loads the newest page; called when the panel opens. */
  load: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (ids: readonly number[]) => Promise<void>;
  markAllRead: () => Promise<void>;
};

/**
 * The signed-in player's notifications. The unread count is polled while the tab is visible and
 * refreshed when it regains focus; the list itself is only fetched when someone looks at it. Tabs
 * share read state over a BroadcastChannel so marking read in one clears the badge in the others.
 */
export function useNotificationInbox(accountId: string | undefined): NotificationInbox {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AccountNotification[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const channel = useRef<BroadcastChannel | undefined>(undefined);

  useEffect(() => {
    setUnread(0);
    setItems([]);
    setNextBefore(null);
    if (!accountId) return;

    let stopped = false;
    let controller: AbortController | undefined;
    const poll = () => {
      if (stopped || document.visibilityState !== "visible") return;
      controller?.abort();
      controller = new AbortController();
      notificationApi
        .unreadCount(controller.signal)
        .then((count) => {
          if (!stopped) setUnread(count);
        })
        .catch((failure: unknown) => {
          // A lost session stops polling until the account changes; anything else retries next tick.
          if (failure instanceof NotificationApiError && failure.status === 401) stopped = true;
        });
    };
    poll();
    const timer = window.setInterval(poll, NOTIFICATION_POLL_MS);
    document.addEventListener("visibilitychange", poll);
    window.addEventListener("focus", poll);

    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel(CHANNEL);
      channel.current.onmessage = (event: MessageEvent<{ accountId: string; unread: number }>) => {
        if (event.data.accountId !== accountId) return;
        setUnread(event.data.unread);
        setItems((current) => (event.data.unread === 0 ? current.map(markedRead) : current));
      };
    }
    return () => {
      stopped = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
      window.removeEventListener("focus", poll);
      channel.current?.close();
      channel.current = undefined;
    };
  }, [accountId]);

  const share = useCallback(
    (count: number) => {
      setUnread(count);
      if (accountId) channel.current?.postMessage({ accountId, unread: count });
    },
    [accountId],
  );

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setFailed(false);
    try {
      const page = await notificationApi.list();
      setItems(page.items);
      setNextBefore(page.nextBefore);
      setUnread(page.unread);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const loadMore = useCallback(async () => {
    if (!accountId || nextBefore === null) return;
    setLoading(true);
    try {
      const page = await notificationApi.list(nextBefore);
      setItems((current) => [...current, ...page.items.filter((item) => !current.some(({ id }) => id === item.id))]);
      setNextBefore(page.nextBefore);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [accountId, nextBefore]);

  const markRead = useCallback(
    async (ids: readonly number[]) => {
      const pending = ids.filter((id) => items.some((item) => item.id === id && item.readAt === null));
      if (!pending.length) return;
      setItems((current) => current.map((item) => (pending.includes(item.id) ? markedRead(item) : item)));
      // On failure the optimistic state stays and the next poll brings back the server's count.
      const count = await notificationApi.markRead(pending).catch(() => undefined);
      if (count !== undefined) share(count);
    },
    [items, share],
  );

  const markAllRead = useCallback(async () => {
    setItems((current) => current.map(markedRead));
    const count = await notificationApi.markRead("all").catch(() => undefined);
    if (count !== undefined) share(count);
  }, [share]);

  return { unread, items, nextBefore, loading, failed, load, loadMore, markRead, markAllRead };
}

function markedRead(item: AccountNotification): AccountNotification {
  return item.readAt === null ? { ...item, readAt: Date.now() } : item;
}
