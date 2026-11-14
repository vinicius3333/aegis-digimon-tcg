import type { CardDefinition, EvoCost } from "@aegis/shared/cards/types";
import { GameRulesPolicy } from "@aegis/shared/sealed/GameRulesPolicy";
import {
  matchingEvoCost,
  matchingEvoCostIgnoringColor,
  matchingEvoCostIgnoringLevel,
} from "#api/engine/cards/cardData";

type Params = { evolving: CardDefinition; base: CardDefinition; policy: GameRulesPolicy; ignoreLevel?: boolean };

export function getPolicyEvoCost({ evolving, base, policy, ignoreLevel = false }: Params): EvoCost | undefined {
  if (policy !== GameRulesPolicy.SEALED.value) {
    return ignoreLevel ? matchingEvoCostIgnoringLevel(evolving, base) : matchingEvoCost(evolving, base);
  }
  if (!ignoreLevel) {
    return matchingEvoCostIgnoringColor(evolving, base);
  }
  if (base.isToken) {
    return undefined;
  }
  return [...evolving.evoCosts].sort((a, b) => a.memoryCost - b.memoryCost)[0];
}
