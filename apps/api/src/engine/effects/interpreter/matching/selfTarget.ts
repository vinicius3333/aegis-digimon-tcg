import type { Permanent } from "@aegis/shared";
import type { CardSource } from "../../CardSource.js";
import type { EffectContext } from "../../EffectContext.js";

/** Keep "this Digimon" bound to the resolving effect's original permanent. A
 * normal evolution preserves that identity; DigiXros into another host does not.
 * Off-field sources retain their existing live lookup for self-play continuations. */
export function selfTargetPermanent(ctx: EffectContext, source: CardSource = ctx.source): Permanent | undefined {
  if (source.instanceId === ctx.source.instanceId && ctx.sourcePermanentIdAtCreation !== undefined) {
    return ctx.game.permanentById(ctx.sourcePermanentIdAtCreation);
  }
  return source.permanent();
}
