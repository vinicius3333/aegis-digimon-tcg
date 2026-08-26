/* How long a client spends narrating what the server just published.

   The animation belongs to the client, but its length is a server concern: an
   automated seat that acts again while a scene is still on screen plays its next
   card over a board the human is still watching resolve. The numbers below are
   the budget such a seat waits out; `apps/web/src/game/timings.ts` owns the real
   durations and its `timings.test.ts` fails if they ever grow past this budget. */

/**
 * A security check, end to end: the shield arming and shattering, then the
 * centre-stage clash from the attacker's entrance to the scene fading out.
 */
export const SECURITY_CHECK_NARRATION_MS = 2_300;

/**
 * A check whose card resolves an effect, which also detours the revealed card to
 * the side of the screen while its effect notice reads.
 */
export const SECURITY_EFFECT_NARRATION_MS = 3_650;
