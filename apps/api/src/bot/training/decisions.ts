import { canAssignDistinctColors, type DecisionRequest, type Intent } from "@aegis/shared";

/** Public metadata only: never resolve a blind choice from the engine's hidden zones. */
export interface SelectionCard {
  cardId?: string;
  playCost?: number;
  dp?: number;
  colors?: readonly string[];
  names?: readonly string[];
}

export interface DecisionChoice {
  key: string;
  label: string;
  referenceId?: string;
  intent?: Intent;
}

export interface DecisionStep {
  request: DecisionRequest;
  selected: readonly string[];
  choices: readonly DecisionChoice[];
}

export type SelectDecisionChoice = (step: DecisionStep) => number;

function selectedIndex(step: DecisionStep, choose: SelectDecisionChoice): DecisionChoice {
  if (step.choices.length === 0) throw new Error(`No legal completion for decision ${step.request.decisionId}`);
  const index = choose(step);
  if (!Number.isInteger(index) || index < 0 || index >= step.choices.length) {
    throw new Error(`Invalid action index ${index} for decision ${step.request.decisionId}`);
  }
  return step.choices[index]!;
}

/** Every subset and order is reachable without materializing exponentially many intents. */
export function chooseDecisionIntent(
  request: DecisionRequest,
  cards: ReadonlyMap<string, SelectionCard>,
  choose: SelectDecisionChoice,
): Intent {
  const respond = (response: Extract<Intent, { type: "respondDecision" }>["response"]): Intent => ({
    type: "respondDecision",
    decisionId: request.decisionId,
    response,
  });
  const options = request.options ?? {};
  const direct = (choices: DecisionChoice[]): Intent =>
    selectedIndex({ request, selected: [], choices }, choose).intent!;
  switch (request.kind) {
    case "mulligan":
      return direct(
        [true, false].map((keep) => ({
          key: String(keep),
          label: keep ? "Keep" : "Mulligan",
          intent: { type: "mulligan", keep },
        })),
      );
    case "optional":
      return direct(
        [true, false].map((accept) => ({
          key: String(accept),
          label: accept ? "Accept" : "Decline",
          intent: respond({ kind: "optional", accept }),
        })),
      );
    case "chooseOption":
      return direct(
        (options.choices ?? []).map((label, optionIndex) => ({
          key: String(optionIndex),
          label,
          intent: respond({ kind: "chooseOption", optionIndex }),
        })),
      );
    case "orderTriggers":
      // A one-entry plan lets the real resolver ask the remaining ordering and
      // optional questions after that effect has changed the board.
      return direct(
        (options.triggerKeys ?? []).map((key, index) => ({
          key,
          label: options.triggerDescriptions?.[index] ?? key,
          referenceId: key,
          intent: respond({ kind: "orderTriggers", order: [key] }),
        })),
      );
    case "orderCards": {
      const remaining = [...(options.candidateInstanceIds ?? [])];
      const order: string[] = [];
      while (remaining.length > 0) {
        const choice = selectedIndex(
          {
            request,
            selected: [...order],
            choices: remaining.map((id) => ({ key: id, label: "Order next", referenceId: id })),
          },
          choose,
        );
        order.push(choice.key);
        remaining.splice(remaining.indexOf(choice.key), 1);
      }
      return respond({ kind: "orderCards", order });
    }
    case "selectCards":
    case "chooseTargets": {
      if (options.assemblyCardId || options.digiXrosCardId) {
        throw new Error("Training material recipes require a specialized selection validator");
      }
      const offered = [...new Set(options.candidateInstanceIds ?? [])];
      const minimum = Math.min(options.min ?? 0, offered.length);
      const maximum = Math.min(options.max ?? offered.length, offered.length);
      const valid = (ids: readonly string[]): boolean => {
        if (ids.length > maximum) return false;
        let cost = 0;
        let dp = 0;
        const cardIds = new Set<string>();
        const names = new Set<string>();
        const colors: (readonly string[])[] = [];
        for (const id of ids) {
          const card = cards.get(id);
          const requireValue = <T>(value: T | undefined, property: string): T => {
            if (value === undefined) throw new Error(`Missing visible ${property} for constrained choice ${id}`);
            return value;
          };
          if (options.maxTotalPlayCost !== undefined) cost += Math.max(0, requireValue(card?.playCost, "play cost"));
          if (options.maxTotalDP !== undefined) dp += Math.max(0, requireValue(card?.dp, "DP"));
          if (options.distinctCardIds) {
            const cardId = requireValue(card?.cardId, "card identity");
            if (cardIds.has(cardId)) return false;
            cardIds.add(cardId);
          }
          if (options.distinctNames) {
            const values = requireValue(card?.names, "names").map((name) => name.toLowerCase());
            if (values.some((name) => names.has(name))) return false;
            for (const name of values) names.add(name);
          }
          if (options.differentColors) {
            const values = requireValue(card?.colors, "colors");
            colors.push(values);
            if (!canAssignDistinctColors(colors)) return false;
          }
        }
        return (
          (options.maxTotalPlayCost === undefined || cost <= options.maxTotalPlayCost) &&
          (options.maxTotalDP === undefined || dp <= options.maxTotalDP)
        );
      };
      const canFinish = (ids: readonly string[], remaining: readonly string[]): boolean => {
        if (!valid(ids)) return false;
        if (ids.length >= minimum) return true;
        if (ids.length + remaining.length < minimum || ids.length >= maximum) return false;
        return remaining.some((id, index) => canFinish([...ids, id], remaining.slice(index + 1)));
      };
      const selected: string[] = [];
      for (;;) {
        const remaining = offered.filter((id) => !selected.includes(id));
        const choices: DecisionChoice[] = remaining
          .filter((id) =>
            canFinish(
              [...selected, id],
              remaining.filter((other) => other !== id),
            ),
          )
          .map((id) => ({ key: id, label: "Select", referenceId: id }));
        if (selected.length >= minimum && valid(selected)) choices.push({ key: "finish", label: "Finish selection" });
        const choice = selectedIndex({ request, selected: [...selected], choices }, choose);
        if (choice.referenceId === undefined) return respond({ kind: request.kind, instanceIds: selected });
        selected.push(choice.referenceId);
      }
    }
  }
}
