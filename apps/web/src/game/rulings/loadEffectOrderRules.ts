import type { EffectOrderRulesFile } from "@/game/rulings/RulingsFiles";

let pending: Promise<EffectOrderRulesFile | undefined> | undefined;

export function loadEffectOrderRules(): Promise<EffectOrderRulesFile | undefined> {
  pending ??= import("@/game/rulings/data/effect-order.json")
    .then((module) => module.default as EffectOrderRulesFile)
    .catch(() => {
      pending = undefined;
      return undefined;
    });
  return pending;
}
