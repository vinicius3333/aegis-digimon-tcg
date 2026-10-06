import type { EffectContext } from "./EffectContext.js";

/**
 * A pending optional clause is explained by its decision. Public effect narration starts
 * only when processing is accepted, before its costs or results mutate the board. Context
 * copies retain the callback, so a compiled action and its enclosing clause share one receipt.
 */
export function observeEffectActivation(ctx: EffectContext, deferred: boolean, announce: () => void) {
  const outer = ctx.onActivationChosen;
  const outerPending = ctx.isActivationPending;
  let accepted = false;
  const accept = () => {
    if (accepted) return;
    accepted = true;
    announce();
  };
  ctx.onActivationChosen = accept;
  ctx.isActivationPending = () => !accepted;
  if (!deferred) accept();
  return {
    accept,
    accepted: () => accepted,
    restore: () => {
      ctx.onActivationChosen = outer;
      ctx.isActivationPending = outerPending;
    },
  };
}
