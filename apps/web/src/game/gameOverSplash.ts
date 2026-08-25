/* How the match's last moment reads. The server's `gameOver` event already
   carries both halves of it — a discriminated `result` and one of four `reason`
   codes — so this module only turns that pair into the words and the tone the
   splash wears. No inference: an outcome the event did not name is not guessed.

   Pure; `overlays.tsx` draws it. */

export type GameOverOutcome = "win" | "loss" | "draw";

/** The `reason` codes the `gameOver` event can carry. */
export const GAME_OVER_REASONS = ["security", "deckOut", "surrender", "effect"] as const;

export type GameOverReason = (typeof GAME_OVER_REASONS)[number];

export interface GameOverSplash {
  outcome: GameOverOutcome;
  /** The one big word. */
  titleKey: "overlay.victory" | "overlay.defeat" | "overlay.draw";
  /** The line under it, already specific to both the outcome and the reason. */
  reasonKey: GameOverReasonKey;
  tone: "win" | "loss" | "draw";
}

const REASON_KEYS = {
  win: {
    security: "overlay.reason.win.security",
    deckOut: "overlay.reason.win.deckOut",
    surrender: "overlay.reason.win.surrender",
    effect: "overlay.reason.win.effect",
  },
  loss: {
    security: "overlay.reason.loss.security",
    deckOut: "overlay.reason.loss.deckOut",
    surrender: "overlay.reason.loss.surrender",
    effect: "overlay.reason.loss.effect",
  },
  draw: {
    security: "overlay.reason.draw.security",
    deckOut: "overlay.reason.draw.deckOut",
    surrender: "overlay.reason.draw.surrender",
    effect: "overlay.reason.draw.effect",
  },
} as const;

export type GameOverReasonKey = (typeof REASON_KEYS)[GameOverOutcome][GameOverReason];

/** Whether a string off the wire is one of the four reasons the protocol defines. */
export function isGameOverReason(value: string): value is GameOverReason {
  return (GAME_OVER_REASONS as readonly string[]).includes(value);
}

/**
 * The splash for an outcome and a reason. A reason the protocol has since grown
 * and this client has not been taught falls back to the security wording rather
 * than printing a raw enum name at the player.
 */
export function gameOverSplash(outcome: GameOverOutcome, reason: string): GameOverSplash {
  const known: GameOverReason = isGameOverReason(reason) ? reason : "security";
  return {
    outcome,
    titleKey: outcome === "win" ? "overlay.victory" : outcome === "loss" ? "overlay.defeat" : "overlay.draw",
    reasonKey: REASON_KEYS[outcome][known],
    tone: outcome,
  };
}
