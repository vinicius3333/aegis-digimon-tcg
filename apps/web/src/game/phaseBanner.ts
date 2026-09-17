/* Phase announcements driven by the server, in the order they arrive. */

import { Phase, type Seat } from "@aegis/shared";
import { Side } from "./side";

export interface PhaseBanner {
  /** Re-mounts the banner so its keyframes restart on a repeat of the same phase. */
  key: number;
  phase: string;
  /** Translation key for the announced phase name. */
  labelKey: PhaseBannerLabelKey;
  /** Whose phase it is, from the viewer's side. */
  side: Side;
}

const BANNER_LABEL_KEYS = {
  [Phase.Active]: "game.phaseBanner.active",
  [Phase.Draw]: "game.phaseBanner.draw",
  [Phase.End]: "game.phaseBanner.end",
  [Phase.Breeding]: "game.phaseBanner.breeding",
  [Phase.Main]: "game.phaseBanner.main",
} as const;

export type PhaseBannerLabelKey = (typeof BANNER_LABEL_KEYS)[keyof typeof BANNER_LABEL_KEYS];

/** Whether a phase has an announcement. */
export function isAnnouncedPhase(phase: string): phase is keyof typeof BANNER_LABEL_KEYS {
  return Object.prototype.hasOwnProperty.call(BANNER_LABEL_KEYS, phase);
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
  return {
    key,
    phase,
    labelKey: BANNER_LABEL_KEYS[phase],
    side: turnSeat === viewerSeat ? Side.Viewer : Side.Opponent,
  };
}
