import type { AnimationStep } from "../animationQueue";
import { CueTrack } from "./enums";

/**
 * Whether a step is a MOMENT — something the viewer is being told — rather than decoration.
 *
 * Only a moment holds the board back (net/presentedState.ts): while a deletion's trigger is
 * being read out, the board still shows the permanent it is about. Decoration (a draw
 * flight, a DP pulse, a burst) is drawn over whatever board is on screen and must never
 * freeze it, and the security dock waits on the server rather than on a reader, so it would
 * freeze the board for as long as the check takes.
 */
export const BOARD_HOLDING_TRACKS: readonly string[] = [
  CueTrack.CenterStage,
  // The battle and the blow that ends it: the board stays the board the battle was fought
  // on until it has been fought, whatever the server has resolved since.
  "combatImpact",
  "combatNotices",
];

export function holdsTheBoard(step: AnimationStep): boolean {
  if (step.holdsBoard === false) return false;
  const track = step.track ?? "";
  return (
    step.id.startsWith("narration-step-") ||
    track.startsWith("narration") ||
    track.startsWith("deleteBurst-") ||
    BOARD_HOLDING_TRACKS.includes(track)
  );
}

export const OPTION_DOCK_TRACKS: readonly string[] = [CueTrack.OptionDock, CueTrack.OptionDockHold];
