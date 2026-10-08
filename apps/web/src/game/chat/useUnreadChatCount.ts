import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { playAttentionSound } from "../../design/sound";
import type { ChatEntry } from "./useMatchChat";

/**
 * Messages from anyone else that arrived while the chat window was closed. The first one
 * chimes; the rest only raise the count, so an emote burst does not ring for every emote.
 * An open window in a hidden tab is not being read, so its messages count too.
 */
export function useUnreadChatCount(entries: readonly ChatEntry[] | undefined, open: boolean): number {
  const visible = useSyncExternalStore(subscribeVisibility, isDocumentVisible, () => true);
  const reading = open && visible;
  const newestId = entries?.at(-1)?.id ?? -1;
  const [seenId, setSeenId] = useState(newestId);
  useEffect(() => {
    if (reading) setSeenId(newestId);
  }, [reading, newestId]);

  const unread = reading ? 0 : (entries ?? []).filter((entry) => !entry.own && entry.id > seenId).length;
  const previousUnreadRef = useRef(unread);
  useEffect(() => {
    if (previousUnreadRef.current === 0 && unread > 0) playAttentionSound("prompt");
    previousUnreadRef.current = unread;
  }, [unread]);
  return unread;
}

function subscribeVisibility(listener: () => void): () => void {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}
const isDocumentVisible = () => !document.hidden;
