import { useEffect, useRef } from "react";
import type { AegisRoom } from "../../../net/client";
import { intents } from "../../../net/intents";
import { useSkipNothingToDo } from "@/game/skipNothingToDo/useSkipNothingToDo";

export function useNothingToDoPrompts({ room, ready }: { room: AegisRoom | undefined; ready: boolean }): void {
  const skip = useSkipNothingToDo();
  const sent = useRef<{ roomKey: string; show: boolean } | undefined>(undefined);
  const roomKey = room && `${room.roomId}:${room.sessionId}`;

  useEffect(() => {
    if (!room || !roomKey || !ready) return;
    const show = !skip;
    const previous = sent.current?.roomKey === roomKey ? sent.current.show : undefined;
    sent.current = { roomKey, show };
    if (show !== previous) intents.showNothingToDoPrompts(room, show);
  }, [room, roomKey, ready, skip]);
}
