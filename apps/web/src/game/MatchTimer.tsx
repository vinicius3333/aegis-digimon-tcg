import { createPortal } from "react-dom";
import type { GameState, Seat } from "@aegis/shared";
import { useTranslation } from "../i18n";
import "./matchTimer.css";

export function formatMatchTime(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/** Reads live authoritative state, never the board's held animation snapshot. */
export function MatchTimer({ state, seat, opponent = false }: { state: GameState; seat: Seat; opponent?: boolean }) {
  const { t } = useTranslation();
  if (!state.matchTimer) return null;
  const remaining = Math.max(0, Math.ceil(seat === 0 ? state.timerRemaining0 : state.timerRemaining1));
  const active = !state.gameOver && state.timerActiveSeat === seat;
  const low = remaining <= 30;
  const label = t(opponent ? "game.timer.opponent" : "game.timer.you");
  return (
    <div
      className="match-timer"
      data-active={active || undefined}
      data-low={low || undefined}
      data-side={opponent ? "opponent" : "player"}
      data-testid={opponent ? "opponent-match-timer" : "viewer-match-timer"}
      role="timer"
      aria-label={`${label}: ${formatMatchTime(remaining)}`}
    >
      <svg
        className="match-timer__icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <path d="M6 3h12M6 21h12M7 3v4c0 2 3 3 5 5-2 2-5 3-5 5v4M17 3v4c0 2-3 3-5 5 2 2 5 3 5 5v4" />
        <path d="M9 6h6l-3 3zM9 19l3-3 3 3z" fill="currentColor" stroke="none" />
      </svg>
      <strong className="match-timer__time">{remaining}</strong>
    </div>
  );
}

/** Keep both clocks visible while a decision sheet covers the player identities. */
export function DecisionMatchTimer({ state, seat }: { state: GameState; seat: Seat }) {
  if (!state.matchTimer || state.gameOver || !state.pendingDecision || typeof document === "undefined") return null;
  return createPortal(
    <div className="game-decision-clocks">
      <MatchTimer state={state} seat={(1 - seat) as Seat} opponent />
      <MatchTimer state={state} seat={seat} />
    </div>,
    document.body,
  );
}
