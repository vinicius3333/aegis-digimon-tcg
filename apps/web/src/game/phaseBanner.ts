/* The short "Breeding Phase" / "Main Phase" card the reference client slides
   across the board as a phase opens. Only the two phases the player actually acts
   in are announced: the active, draw and end steps pass in a frame and a banner
   for each would turn every turn into a slideshow.

   Driven entirely by the server's `phaseChanged` event — the phase name and the
   seat it belongs to are both on the wire. Pure. */

import { Phase, type Seat } from "@aegis/shared";

export interface PhaseBanner {
  /** Re-mounts the banner so its keyframes restart on a repeat of the same phase. */
  key: number;
  phase: string;
  /** Translation key for the announced phase name. */
  labelKey: PhaseBannerLabelKey;
  /** Whose phase it is, from the viewer's side. */
  side: "you" | "opp";
}

const BANNER_LABEL_KEYS = {
  [Phase.Breeding]: "game.phaseBanner.breeding",
  [Phase.Main]: "game.phaseBanner.main",
} as const;

export type PhaseBannerLabelKey = (typeof BANNER_LABEL_KEYS)[keyof typeof BANNER_LABEL_KEYS];

/** Whether a phase is one of the two the board announces. */
export function isAnnouncedPhase(phase: string): phase is keyof typeof BANNER_LABEL_KEYS {
  return phase === Phase.Breeding || phase === Phase.Main;
}

/**
 * The banner a `phaseChanged` event raises, or null when the phase passes without
 * one.
 */
export function phaseBannerFrom({
  phase,
  turnSeat,
  viewerSeat,
  key,
}: {
  phase: string;
  turnSeat: Seat;
  viewerSeat: Seat;
  key: number;
}): PhaseBanner | null {
  if (!isAnnouncedPhase(phase)) return null;
  return { key, phase, labelKey: BANNER_LABEL_KEYS[phase], side: turnSeat === viewerSeat ? "you" : "opp" };
}
