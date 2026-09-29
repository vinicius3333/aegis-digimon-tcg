import { requireOpponentAsk } from "../../decisions/decisionApi.js";
import type { EffectContext, SeatScopedDecisionApi } from "../EffectContext.js";

export interface DigivolutionTrashHosts {
  hostPermanentIds: string[];
  /** Who picks the cards to trash: the replacement's activator after a redirect (KB Q2005). */
  chooser: SeatScopedDecisionApi;
}

/**
 * Offers a digivolution-card trash about to hit `hostPermanentIds` to the active redirect
 * replacements (BT10-084 Tactimon, KB Q2002-Q2008) before any card is chosen.
 */
export async function redirectDigivolutionTrash(
  ctx: EffectContext,
  hostPermanentIds: string[],
): Promise<DigivolutionTrashHosts> {
  const redirected = ctx.fx.redirectDigivolutionTrashHosts
    ? await ctx.fx.redirectDigivolutionTrashHosts(hostPermanentIds)
    : hostPermanentIds;
  const unchanged =
    redirected.length === hostPermanentIds.length && redirected.every((id, index) => id === hostPermanentIds[index]);
  if (unchanged) return { hostPermanentIds: redirected, chooser: ctx.ask };
  const activatorSeat = ctx.game.permanentById(redirected[0] ?? "")?.controllerSeat;
  const chooser =
    activatorSeat === undefined || activatorSeat === ctx.source.ownerSeat ? ctx.ask : requireOpponentAsk(ctx);
  return { hostPermanentIds: redirected, chooser };
}
