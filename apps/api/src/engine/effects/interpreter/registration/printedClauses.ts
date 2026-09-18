import {
  CONTINUOUS_TRIGGERS,
  getCardDefinition,
  printedClauseForEffect,
  printedClauseForWatcher,
  type Action,
  type CardEffect,
  type CompiledCard,
} from "@aegis/shared";

function withWatcherClauses(effect: CardEffect, clauseFor: (action: Action) => string | undefined): CardEffect {
  if (!CONTINUOUS_TRIGGERS.has(effect.trigger) || effect.actions === undefined) return effect;
  let changed = false;
  const actions = effect.actions.map((action) => {
    if (action.kind !== "SubTrigger" || action.printedClause !== undefined) return action;
    const clause = clauseFor(action);
    if (clause === undefined) return action;
    changed = true;
    return { ...action, printedClause: clause };
  });
  return changed ? { ...effect, actions } : effect;
}

/**
 * Fill in the printed clause each compiled effect and watcher came from, wherever the card
 * text makes that unambiguous. Decisions, the trigger chooser, and the feed all show
 * `description` (or a watcher's `printedClause`) to the player; an authored one is never replaced.
 */
export function withPrintedClauses(cardId: string, compiled: CompiledCard): CompiledCard {
  const definition = getCardDefinition(cardId);
  if (definition === undefined) return compiled;
  let changed = false;
  const effectsPerTrigger = new Map<string, number>();
  for (const effect of compiled.effects) {
    const key = `${effect.trigger}/${effect.isInherited === true}`;
    effectsPerTrigger.set(key, (effectsPerTrigger.get(key) ?? 0) + 1);
  }
  const effects = compiled.effects.map((effect) => {
    let next = effect;
    if (next.description === undefined) {
      const sharesTrigger = (effectsPerTrigger.get(`${effect.trigger}/${effect.isInherited === true}`) ?? 0) > 1;
      const clause = printedClauseForEffect({ definition, effect, requireHints: sharesTrigger });
      if (clause !== undefined) next = { ...next, description: clause };
    }
    next = withWatcherClauses(next, (action) =>
      action.kind === "SubTrigger"
        ? printedClauseForWatcher({ definition, effect, event: action.event, action })
        : undefined,
    );
    if (next !== effect) changed = true;
    return next;
  });
  return changed ? { ...compiled, effects } : compiled;
}
