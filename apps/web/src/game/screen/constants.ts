import { Phase } from "@aegis/shared";

export const PHASES: Phase[] = [Phase.Active, Phase.Draw, Phase.Breeding, Phase.Main, Phase.End];

/** A battle loser's stand-in card, sized to the shatter that takes over from it. */
export const FIELD_CLASH_GHOST_WIDTH = 72;
export const FIELD_CLASH_GHOST_HEIGHT = Math.round(FIELD_CLASH_GHOST_WIDTH * 1.4);
