import { createPortal } from "react-dom";
import type { GameState, Seat } from "@aegis/shared";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import "./matchTimer.css";

export function formatMatchTime(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/** Reads live authoritative state, never the board's held animation snapshot. */
export function MatchTimer({ state, seat, opponent = false }: { state: GameState; seat: Seat; opponent?: boolean }) {
  const { t } = useTranslation();
  if (!state.matchTimer || state.gameOver || state.timerActiveSeat !== seat) return null;
  const remaining = seat === 0 ? state.timerRemaining0 : state.timerRemaining1;
  const low = remaining <= 30;
  const label = t(opponent ? "game.timer.opponent" : "game.timer.you");
  const status = t(low ? "game.timer.low" : opponent ? "game.opponentsTurn" : "game.timer.active");
  return (
    <div
      className="match-timer"
      data-active="true"
      data-low={low || undefined}
      data-testid={opponent ? "opponent-match-timer" : "viewer-match-timer"}
      role="timer"
      aria-label={`${label}: ${formatMatchTime(remaining)}. ${status}`}
    >
      <div className="match-timer__label">
        <span>{label}</span>
        <Icons.Clock size={14} />
      </div>
      <strong className="match-timer__time">{formatMatchTime(remaining)}</strong>
      <span className="match-timer__status">{status}</span>
      <div className="match-timer__track" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (remaining / state.timerStartSeconds) * 100)}%` }} />
      </div>
    </div>
  );
}

/** Keep the responder's bank visible when a decision sheet covers the board. */
export function DecisionMatchTimer({ state, seat }: { state: GameState; seat: Seat }) {
  if (
    !state.matchTimer ||
    state.gameOver ||
    state.timerActiveSeat !== seat ||
    state.pendingDecision?.seat !== seat ||
    typeof document === "undefined"
  )
    return null;
  return createPortal(
    <div className="game-decision-clock">
      <MatchTimer state={state} seat={seat} />
    </div>,
    document.body,
  );
}
