// The runtime registry of compiled card records.

import type { EffectModule } from "../EffectModule.js";
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";

// Per-card modules are the runtime source of truth. Hand-written overrides can intentionally
// differ from the generated shared aggregate, so nested actions (for example ActivateMain)
// must resolve the same CompiledCard that was used to register the module's effects.
export const registeredCompiledCards = new Map<string, CompiledCard>();

export const registeredIrModules = new Map<string, EffectModule>();

export function runtimeCompiledCard(cardId: string): CompiledCard | undefined {
  return registeredCompiledCards.get(cardId) ?? getCompiledCard(cardId);
}

/** Whether the runtime card module owns an inline compiled IR record. */
export function hasRegisteredCompiledCard(cardId: string): boolean {
  return registeredCompiledCards.has(cardId);
}

/** Names a card is unconditionally also treated as in every zone. */
export function universalNameAliasesFor(cardId: string): string[] {
  const compiled = runtimeCompiledCard(cardId);
  if (compiled === undefined) return [];

  const aliases = new Set<string>();
  for (const effect of compiled.effects) {
    if (effect.trigger !== "Rule") continue;
    for (const action of effect.actions) {
      if (
        action.kind !== "GrantStatic" ||
        action.grant !== "name" ||
        action.digiXrosOnly === true ||
        action.target.isSelf !== true
      )
        continue;
      for (const token of action.tokens ?? []) aliases.add(token);
    }
  }
  return [...aliases];
}
