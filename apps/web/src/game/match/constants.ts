import { TIMINGS } from "../timings";

/** Must match `.game-delete-burst` in game.css. */
export const DELETE_BURST_SIZE = 96;

/** The phase name the protocol uses for the step that unsuspends the turn player's board. */
export const UNSUSPEND_PHASE = "Active";

/** Slots the sweep staggers across before the last card has started turning. */
export const UNSUSPEND_SWEEP_SLOTS = 8;

/** How long the whole board takes to finish unsuspending, last slot included. */
export const UNSUSPEND_SWEEP_MS = TIMINGS.suspendRotate + UNSUSPEND_SWEEP_SLOTS * TIMINGS.suspendStagger;
