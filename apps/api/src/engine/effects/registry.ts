import type { EffectModule } from "./EffectModule.js";

const modules = new Map<string, EffectModule>();

/**
 * Register a card's EffectModule. Each card file calls this as an import
 * side-effect (card-module contract). Throws on a duplicate cardId so a
 * double-port fails loudly at boot.
 *
 * @deprecated Use `registerIrCard(cardId, compiled)` for card implementations.
 * Keep this only for legacy handwritten modules, engine tests, and explicitly
 * justified internal seams.
 */
export function registerCard(module: EffectModule): void {
  if (modules.has(module.cardId)) {
    throw new Error(`Duplicate card registration: ${module.cardId}`);
  }
  modules.set(module.cardId, module);
}

/** Look up a registered module by card id. */
export function getEffectModule(cardId: string): EffectModule | undefined {
  return modules.get(cardId);
}

/**
 * Remove a card's registration and return the prior module, if any. Test-only seam:
 * a test that installs a stand-in module for a real cardId can restore the original
 * afterward, keeping the shared registry correct under Vitest's `isolate: false`
 * (one module graph — and so one registry — reused across test files).
 */
export function unregisterCard(cardId: string): EffectModule | undefined {
  const prior = modules.get(cardId);
  modules.delete(cardId);
  return prior;
}

/** Count of registered card modules (useful for a boot log / sanity check). */
export function registeredCardCount(): number {
  return modules.size;
}

/** All registered (cardId, module) pairs. Intended for test iteration only. */
export function allRegisteredModules(): ReadonlyMap<string, EffectModule> {
  return modules;
}
