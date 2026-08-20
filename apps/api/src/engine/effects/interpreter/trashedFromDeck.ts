// A loose card's own "when this card is trashed from the deck" body.

import type { EffectContext } from "../EffectContext.js";
import { getEffectModule } from "../registry.js";
import { runtimeCompiledCard } from "./compiledCards.js";
import { runAction } from "./dispatch.js";

/** Resolve a loose card's own "when this card is trashed from the deck" body. */
export async function resolveSelfWhenTrashedFromDeck(ctx: EffectContext): Promise<void> {
  const module = getEffectModule(ctx.source.cardId);
  if (module?.onTrashedFromDeck !== undefined) {
    await module.onTrashedFromDeck(ctx);
    return;
  }
  const compiled = runtimeCompiledCard(ctx.source.cardId);
  if (compiled === undefined) return;
  for (const effect of compiled.effects) {
    for (const action of effect.actions ?? []) {
      if (
        action.kind !== "SubTrigger" ||
        action.event !== "whenTrashedFromDeck" ||
        action.sourceFilter?.isSelfRef !== true
      )
        continue;
      if (action.optional === true && !(await ctx.ask.optional(ctx, action.raw ?? "Activate this effect?"))) continue;
      for (const nested of action.actions) await runAction(ctx, nested);
    }
  }
}
