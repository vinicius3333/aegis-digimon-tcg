import { useEffect, useRef, useState } from "react";
import { playSound } from "../../design/sound";
import type { ChatEntry } from "./useMatchChat";

/**
 * Messages from anyone else that arrived while the chat window was closed. The first one
 * chimes; the rest only raise the count, so an emote burst does not ring for every emote.
 */
export function useUnreadChatCount(entries: readonly ChatEntry[] | undefined, open: boolean): number {
  const newestId = entries?.at(-1)?.id ?? -1;
  const [seenId, setSeenId] = useState(newestId);
  useEffect(() => {
    if (open) setSeenId(newestId);
  }, [open, newestId]);

  const unread = open ? 0 : (entries ?? []).filter((entry) => !entry.own && entry.id > seenId).length;
  const previousUnreadRef = useRef(unread);
  useEffect(() => {
    if (previousUnreadRef.current === 0 && unread > 0) playSound("prompt");
    previousUnreadRef.current = unread;
  }, [unread]);
  return unread;
}
