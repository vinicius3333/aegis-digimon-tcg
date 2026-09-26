import {
  CONTINUOUS_TRIGGERS,
  getCardDefinition,
  printedClauseForEffect,
  printedClauseForWatcher,
  printedClausesForTrigger,
  type Action,
  type CardDefinition,
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
  const ordered = withClausesInPrintedOrder(definition, effects);
  return changed || ordered !== effects ? { ...compiled, effects: ordered } : compiled;
}

const sameText = (left: string, right: string) =>
  left.replace(/\s+/g, " ").trim() === right.replace(/\s+/g, " ").trim();

/**
 * Effects that share a trigger and that no `raw` fragment tells apart (EX13-016's two
 * "[On Play] [When Digivolving]" clauses) take the printed clauses in order, when the card
 * prints exactly one clause per effect. A group is left alone if any effect already named a
 * clause that is not the one at its position: that group was not compiled in printed order.
 */
function withClausesInPrintedOrder(definition: CardDefinition, effects: CardEffect[]): CardEffect[] {
  const groups = new Map<string, number[]>();
  effects.forEach((effect, index) => {
    const key = `${effect.trigger}/${effect.isInherited === true}`;
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });
  const next = [...effects];
  for (const indices of groups.values()) {
    if (indices.length < 2 || indices.every((index) => effects[index]!.description !== undefined)) continue;
    const first = effects[indices[0]!]!;
    const clauses = printedClausesForTrigger({
      definition,
      trigger: first.trigger,
      inherited: first.isInherited === true,
    });
    if (clauses.length !== indices.length) continue;
    const inOrder = indices.every((index, position) => {
      const description = effects[index]!.description;
      return description === undefined || sameText(description, clauses[position]!);
    });
    if (!inOrder) continue;
    indices.forEach((index, position) => {
      if (next[index]!.description === undefined) next[index] = { ...next[index]!, description: clauses[position]! };
    });
  }
  return next.some((effect, index) => effect !== effects[index]) ? next : effects;
}
