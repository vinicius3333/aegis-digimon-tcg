import { AsyncLocalStorage } from "node:async_hooks";

// One async hook for the process, independent of how many matches have existed.
// Per-match AsyncLocalStorage instances stay registered until disable() is called;
// on Node 20/22 every subsequent promise then pays for all of those old instances.
const scopes = new AsyncLocalStorage<ReadonlyMap<symbol, boolean>>();

/** Async mutation tier for one match, isolated from other matches and sibling flows. */
export class ContinuousEffectScope {
  private readonly key = Symbol();

  getStore(): boolean | undefined {
    return scopes.getStore()?.get(this.key);
  }

  run<T>(continuous: boolean, body: () => T): T {
    // Copy the enclosing context so nesting across matches preserves both tiers,
    // while an override in one async branch cannot mutate a sibling's context.
    // Keys are symbols, so the context never retains a GameEngine or its board.
    const context = new Map(scopes.getStore());
    context.set(this.key, continuous);
    return scopes.run(context, body);
  }
}
