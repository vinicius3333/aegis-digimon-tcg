// The one cycle the interpreter cannot design away: `runAction` dispatches to the per-kind
// handlers, and several handlers run nested actions or whole effects of their own.
//
// Rather than let those modules import each other in a circle, handlers call the runners
// through this seam and the two owning modules install themselves at load time. That keeps the
// module graph acyclic, so the layering is a property a linter can check rather than a
// convention, and a missing install fails loudly instead of as `undefined is not a function`.

import type { Action, CardEffect } from "@aegis/shared";
import type { EffectContext } from "../EffectContext.js";

/** Runs one action, returning true when the remaining actions in the sequence must abort. */
export type ActionRunner = (ctx: EffectContext, action: Action) => Promise<boolean>;

/** Runs one whole CardEffect: its gate, its cost, then its actions in order. */
export type EffectRunner = (ctx: EffectContext, effect: CardEffect) => Promise<void>;

/**
 * What `runAction` works out before dispatching that a case body still needs.
 */
export interface ActionScope {
  /** The `for each ...` multiplier, or undefined when the action carries no scaling clause. */
  scale: number | undefined;
  /**
   * Permanents suspended by an Attack's OWN suspend cost, whose suspend triggers were held back
   * until the attack is declared so a watcher cannot interrupt the declaration.
   */
  deferredCostSuspensions: string[];
}

let actionRunner: ActionRunner | undefined;
let effectRunner: EffectRunner | undefined;

/** Called by `runAction.ts` at load time. */
export function installActionRunner(runner: ActionRunner): void {
  actionRunner = runner;
}

/** Called by `effect.ts` at load time. */
export function installEffectRunner(runner: EffectRunner): void {
  effectRunner = runner;
}

export const runAction: ActionRunner = (ctx, action) => {
  if (actionRunner === undefined) {
    throw new Error(
      "interpreter dispatch: runAction was called before runAction.ts installed it. Import the " +
        "interpreter through ./interpreter.js so every layer is loaded.",
    );
  }
  return actionRunner(ctx, action);
};

export const runEffect: EffectRunner = (ctx, effect) => {
  if (effectRunner === undefined) {
    throw new Error(
      "interpreter dispatch: runEffect was called before effect.ts installed it. Import the " +
        "interpreter through ./interpreter.js so every layer is loaded.",
    );
  }
  return effectRunner(ctx, effect);
};
