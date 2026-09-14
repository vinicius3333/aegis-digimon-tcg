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
  clientTimestamp: number;
  durationMs?: number;
  mode: "live" | "drain" | "replay";
  cancelled: boolean;
  skipping: boolean;
  failed: boolean;
  pendingCount: number;
}
