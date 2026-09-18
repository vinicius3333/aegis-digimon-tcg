/** Diagnostic channel only; these reports never change authoritative game state. */
export const PRESENTATION_CHANNEL = "presentation" as const;

export interface PresentationReport {
  /**
   * `expired` is not a step phase: it is a presentation gate that hit its ceiling instead
   * of being released. Every such ceiling is a safety net over a beat that should have
   * been handed over explicitly, so one firing means a cue sat there for its whole ceiling
   * with the board held at an older revision. Reported so the stall is visible in the
   * match log without waiting for a player to describe a frozen screen.
   */
  phase: "queued" | "started" | "shown" | "finished" | "dropped" | "expired";
  stepId: string;
  track: string;
  batchId?: string;
  stateVersion?: number;
  sourceCardId?: string;
  timing?: string;
  /**
   * Whose side of the screen the step was drawn on, from the reporting seat's point of
   * view. Set by the cues that exist once per side — a draw flight, a turn or phase
   * ribbon — where the track name alone cannot say which hand or seat moved.
   */
  side?: "you" | "opp";
  clientTimestamp: number;
  durationMs?: number;
  mode: "live" | "drain" | "replay";
  cancelled: boolean;
  skipping: boolean;
  failed: boolean;
  pendingCount: number;
}
