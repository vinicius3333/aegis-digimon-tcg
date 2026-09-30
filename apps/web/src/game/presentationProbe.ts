/* Dev-only hooks into the match screen's presentation. The effects lab reads the queue's
   step events and the closed server batches through these, and drives the queue's playback
   controls, without opening a second connection. Absent, the match screen behaves exactly
   as it does without them. */

import type { DecisionRequest } from "@aegis/shared";
import type { AnimationQueue, AnimationStepEvent } from "./animationQueue";
import type { ServerBatch } from "../net/serverBatches";

/**
 * How simultaneous effects are paced on screen. `current` is today's behaviour; the others
 * are studied in the effects lab before any of them ships.
 */
export type PresentationPacing = "current" | "sequential";

export interface PresentationControls {
  queue: Pick<
    AnimationQueue,
    "setRate" | "getRate" | "pause" | "resume" | "isPaused" | "stepOnce" | "pendingCount" | "isIdle"
  >;
  /** The screen's own fast-forward, which also drops the narration still queued. */
  fastForward(): void;
}

export interface PresentationStepEvent extends AnimationStepEvent {
  /** The server batch the step was enqueued for, when the step carries one. */
  batch?: { batchId: string; stateVersion: number };
  /** `performance.now()` when the event fired. */
  at: number;
}

export interface PresentationProbe {
  onQueue?(controls: PresentationControls): void;
  onStep?(event: PresentationStepEvent): void;
  /** Every closed server batch, replayed history included, before it is presented. */
  onBatch?(batch: ServerBatch): void;
  onDecision?(decision: DecisionRequest | undefined): void;
}
