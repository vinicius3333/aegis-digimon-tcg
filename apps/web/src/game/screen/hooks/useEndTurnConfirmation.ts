import { useEffect, useRef, useState } from "react";
import { Phase } from "@aegis/shared";

const SKIP_CONFIRMATION_KEY = "aegis.skip-end-turn-confirmation";

/** Confirm Main-phase passes, and discard the question when the live action window changes. */
export function useEndTurnConfirmation({
  phase,
  turnCount,
  blocked,
  onEndPhase,
}: {
  phase: Phase;
  turnCount: number;
  blocked: boolean;
  onEndPhase: () => void;
}) {
  const [skipConfirmation, setSkipConfirmation] = useState(() => {
    try {
      return localStorage.getItem(SKIP_CONFIRMATION_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [requestedTurn, setRequestedTurn] = useState<number | null>(null);
  const submitting = useRef(false);
  const open = requestedTurn === turnCount && phase === Phase.Main && !blocked;
  useEffect(() => {
    if (blocked || phase !== Phase.Main || requestedTurn !== turnCount) setRequestedTurn(null);
  }, [blocked, phase, turnCount, requestedTurn]);
  useEffect(() => {
    submitting.current = false;
  }, [blocked, phase, turnCount]);
  return {
    open,
    request() {
      if (blocked || submitting.current) return;
      if (phase === Phase.Main && skipConfirmation) {
        submitting.current = true;
        onEndPhase();
      } else if (phase === Phase.Main) setRequestedTurn(turnCount);
      else onEndPhase();
    },
    cancel() {
      setRequestedTurn(null);
    },
    confirm(skipFuture = false) {
      if (!open || submitting.current) return;
      submitting.current = true;
      if (skipFuture) {
        setSkipConfirmation(true);
        try {
          localStorage.setItem(SKIP_CONFIRMATION_KEY, "true");
        } catch {
          /* The preference still applies for this mounted match. */
        }
      }
      setRequestedTurn(null);
      onEndPhase();
    },
  };
}
