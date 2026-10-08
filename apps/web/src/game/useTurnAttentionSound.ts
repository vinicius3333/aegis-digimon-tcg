import { useEffect, useRef } from "react";
import { playAttentionSound } from "../design/sound";

/** Rings when the turn passes to a player who is looking at another tab or window. */
export function useTurnAttentionSound(isMyTurn: boolean): void {
  const previousRef = useRef(isMyTurn);
  useEffect(() => {
    const started = isMyTurn && !previousRef.current;
    previousRef.current = isMyTurn;
    if (started && (document.hidden || !document.hasFocus())) playAttentionSound("turnChange");
  }, [isMyTurn]);
}
