import { useCallback, useEffect, useRef, useState } from "react";
import { CHAT_CHANNEL, CHAT_COOLDOWN_MS, type ChatBroadcast, type ChatMessage, type Seat } from "@aegis/shared";
import type { AegisRoom } from "../../net/client";

const HISTORY_LIMIT = 50;
/** Network jitter can bring two sends closer together on the server than they left the client. */
const COOLDOWN_MARGIN_MS = 250;

export interface ChatEntry extends ChatBroadcast {
  id: number;
  /** Sent by this client: the viewer's seat, or this spectator's own session. */
  own: boolean;
}

export interface MatchChat {
  /** Oldest first, without whatever the viewer has muted. */
  entries: readonly ChatEntry[];
  /** The newest player message from each seat, for the speech bubbles. */
  latest: Partial<Record<Seat, ChatEntry>>;
  mutedOpponent: boolean;
  setMutedOpponent: (muted: boolean) => void;
  mutedSpectators: boolean;
  setMutedSpectators: (muted: boolean) => void;
  /** Absent while there is no open room to send through. */
  send: ((message: ChatMessage) => void) | undefined;
  /** True while the server would drop a new message from this sender. */
  coolingDown: boolean;
}

/**
 * Listens on the chat channel of `room`. Messages are shown only after the server echoes
 * them, so a message the server dropped never appears as sent.
 */
export function useMatchChat({
  room,
  viewerSeat,
  spectating,
}: {
  room: AegisRoom | undefined;
  viewerSeat: Seat;
  spectating: boolean;
}): MatchChat {
  const [entries, setEntries] = useState<readonly ChatEntry[]>([]);
  const [mutedOpponent, setMutedOpponent] = useState(false);
  const [mutedSpectators, setMutedSpectators] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const nextIdRef = useRef(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!room) return;
    return room.onMessage<ChatBroadcast>(CHAT_CHANNEL, (broadcast) => {
      const { sender } = broadcast;
      const own =
        sender.kind === "player" ? !spectating && sender.seat === viewerSeat : sender.sessionId === room.sessionId;
      const entry = { ...broadcast, id: nextIdRef.current++, own };
      setEntries((previous) => [...previous.slice(1 - HISTORY_LIMIT), entry]);
    });
  }, [room, viewerSeat, spectating]);

  useEffect(() => () => clearTimeout(cooldownTimerRef.current), []);

  const send = useCallback(
    (message: ChatMessage) => {
      if (!room?.connection?.isOpen || cooldownTimerRef.current !== undefined) return;
      room.send(CHAT_CHANNEL, message);
      setCoolingDown(true);
      cooldownTimerRef.current = setTimeout(() => {
        cooldownTimerRef.current = undefined;
        setCoolingDown(false);
      }, CHAT_COOLDOWN_MS + COOLDOWN_MARGIN_MS);
    },
    [room],
  );

  const shown = entries.filter(({ own, sender }) => {
    if (own) return true;
    if (sender.kind === "spectator") return !mutedSpectators;
    return !(mutedOpponent && !spectating && sender.seat !== viewerSeat);
  });
  const latest: Partial<Record<Seat, ChatEntry>> = {};
  for (const entry of shown) if (entry.sender.kind === "player") latest[entry.sender.seat] = entry;

  return {
    entries: shown,
    latest,
    mutedOpponent,
    setMutedOpponent,
    mutedSpectators,
    setMutedSpectators,
    send: room ? send : undefined,
    coolingDown,
  };
}
