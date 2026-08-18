import type { Permanent } from "@aegis/shared";
import type { EffectContext } from "./EffectContext.js";
import type { SubTriggerRegistry } from "./subtriggers.js";

/**
 * The narrow seam the digivolution-trash-redirect consult needs from its host engine
 * (subsystem: delayed-and-rule-effects). Kept tiny so the consult can be unit-tested against a
 * fake without standing up a whole GameEngine — mirrors `LeavePreventionHost`.
 */
export interface DigivolutionTrashRedirectHost {
  subTriggers: SubTriggerRegistry;
  /** The live permanent for a reaction's source id (undefined when it has left the field). */
  permanentById(permanentId: string): Permanent | undefined;
  /** Build the reaction's EffectContext for its source permanent (the reacting Digimon). */
  buildContext(sourcePermanent: Permanent): EffectContext;
}

/**
 * Consult active digivolution-card-trash "redirect" replacements (BT10-084 Tactimon; KB
 * Q2002-Q2008) for a trash operation about to target `originalHostPermanentIds`. Called BEFORE
 * the specific cards to trash are chosen, so a redirect swaps only the HOST — the caller's own
 * top/bottom/choose/amount selection logic then re-runs against the new host's stack unchanged,
 * which is what keeps the redirected trash faithful in count and selection kind to the original
 * action (Q2003's "trash all" still trashes ALL of the new host's cards; Q2004's "trash as many
 * as possible" falls out of the caller re-clamping its own count to the new host's stack length
 * — nothing special-cased here).
 *
 * A redirect only fires when EVERY host in `originalHostPermanentIds` is eligible (same
 * controller as the reacting Digimon, not the reacting Digimon's own stack, and any other gate
 * the install's `appliesTo` encodes, e.g. "only during my opponent's turn"). A mixed-ownership
 * target set — which no known card produces — is left unredirected rather than guessed at. At
 * most one reaction applies per call (the first eligible one the controller accepts wins);
 * returns `undefined` (meaning "no change") when no reaction is installed, none is fully
 * eligible, or the controller declines every eligible one.
 */
export async function consultDigivolutionTrashRedirect(
  host: DigivolutionTrashRedirectHost,
  originalHostPermanentIds: string[],
): Promise<string | undefined> {
  if (originalHostPermanentIds.length === 0) return undefined;
  const replacements = host.subTriggers.replacementsFor("wouldTrashDigivolutionCard");
  if (replacements.length === 0) return undefined;
  for (const repl of replacements) {
    if (repl.mode !== "redirect") continue;
    if (repl.sourcePermanentId === undefined) continue;
    const srcPerm = host.permanentById(repl.sourcePermanentId);
    if (srcPerm === undefined) continue;
    const ctx = host.buildContext(srcPerm);
    const allEligible = originalHostPermanentIds.every((id) => repl.appliesTo?.(ctx, id) === true);
    if (!allEligible) continue;
    const target = await repl.redirectTo(ctx, originalHostPermanentIds);
    if (target !== undefined) return target;
  }
  return undefined;
}
