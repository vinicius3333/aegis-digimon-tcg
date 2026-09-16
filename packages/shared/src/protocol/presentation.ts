/** Diagnostic channel only; these reports never change authoritative game state. */
export const PRESENTATION_CHANNEL = "presentation" as const;

export interface PresentationReport {
  phase: "queued" | "started" | "shown" | "finished" | "dropped";
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
