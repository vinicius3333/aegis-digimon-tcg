// @ts-nocheck
// HAND-FIXED — preserve: the -2 reduction is a hand-resident would-digivolve modifier.
import { EffectTiming, isTamer, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { digivolveCostStatic } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// "When one of your Digimon with a Tamer card in its digivolution cards digivolves
// into this card in your hand, reduce the memory cost of the digivolution by 2."
// The SubTrigger fires when a Digimon that has a Tamer in its digivolution stack
// digivolves into this card (this card is the target card in hand).
// "into" on the Replacement restricts the reduction to this card specifically.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GainKeyword",
          "keyword": {
            "keyword": "Recovery",
            "amount": 1,
            "source": "deck"
          },
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hybrid"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "a card with [Hybrid] in its traits is in this Digimon's digivolution cards"
          },
          "raw": "<Recovery +1 (Deck)>"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

const cardId = "BT7-038";
const baseModule = irCardModule(cardId, compiled);
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.None) return effects;

    effects.push(
      digivolveCostStatic({
        source,
        effectKey: `${cardId}/hand-cost-reduction`,
        description:
          "When one of your Digimon with a Tamer in its digivolution cards digivolves into this card, reduce the cost by 2.",
        when: (ctx) =>
          ctx.game.player(source.ownerSeat).hand.some((card) => card.instanceId === source.instanceId),
        resolve: async (ctx) => {
          ctx.fx.changeEvoCost(
            ({ target, into }) =>
              target.controllerSeat === source.ownerSeat &&
              !target.inBreeding &&
              into?.cardId === cardId &&
              target.stack.some((card) => isTamer(ctx.game.definitionOf(card))),
            -2,
          );
        },
      }),
    );
    return effects;
  },
};

registerCard(module);
export default module;
