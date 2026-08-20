// How the interpreter reports an action it cannot execute.

import { logError } from "../../../logger.js";
import type { EffectContext } from "../EffectContext.js";
import type { Action } from "@aegis/shared";

/**
 * IR interpreter (subsystem: effect-framework / effect-primitives bridge).
 *
 * Turns the declarative CardEffect[] produced by runtime effect records into
 * runtime behavior by dispatching each `Action` to the existing effect
 * primitives (`ctx.fx.*`). It also provides `irCardModule(cardId, compiled)`, a
 * generic EffectModule factory that maps each CardEffect's trigger to an
 * EffectTiming and wires the right timing builder — so a card with a compiled IR
 * record needs no hand-written module.
 *
 * Design constraints (card-module contract / task):
 *   - Breadth over depth for v1: the high-frequency Action kinds are implemented;
 *     everything else (and every RawUnparsed) is routed through `unsupported`,
 *     which logs and (in dev) throws, so gaps are LOUD, never a silent no-op.
 *   - The interpreter only calls primitives that exist on the `Primitives`
 *     interface and resolves targets through read-only GameAccess + the seat-keyed
 *     decision API exposed as `ctx.ask`.
 */

// ---------------------------------------------------------------------------
// Dev/strictness switch
// ---------------------------------------------------------------------------

/**
 * When true, an unsupported action throws (so tests/dev surface the gap); when
 * false (production), it logs and continues so one un-implemented clause cannot crash
 * a live match. Defaults to throwing unless NODE_ENV === "production".
 */
const STRICT = process.env.NODE_ENV !== "production";

/**
 * Keywords whose "gain" performs a VERB (a one-shot action) rather than conferring a
 * passive/continuous ability. Granting these as a continuous keyword would silently
 * drop their effect, so the interpreter routes them to `unsupported` until each
 * verb is wired. Every OTHER keyword (Blocker, Rush, Jamming, Raid, Reboot, Barrier,
 * Evade, Save, Decoy, Security Attack, ...) is a continuous ability recorded in the
 * continuous-effect ledger via `grantKeyword`.
 */
// BlastDigivolve and BlastDNADigivolve are continuous keyword abilities (not verbs)
// and fall through to grantKeyword below. Only genuine verb-keywords belong here.
export const ACTION_TYPE_KEYWORDS = new Set<string>([
  "Draw",
  "DeDigivolve",
  "DigiBurst",
  "Recovery",
  "Digisorption",
  "DNADigivolve",
]);

export class UnsupportedEffectError extends Error {
  constructor(
    readonly cardId: string,
    readonly action: Action,
    detail: string,
  ) {
    super(`Unsupported effect on ${cardId}: ${detail}`);
    this.name = "UnsupportedEffectError";
  }
}

export function unsupported(ctx: EffectContext, action: Action, detail: string): void {
  const cardId = ctx.source.cardId;
  if (STRICT) throw new UnsupportedEffectError(cardId, action, detail);
  logError(`[interpreter] unsupported action on ${cardId}: ${detail}`, action);
}
