// @ts-nocheck
// HAND-FIXED — preserve: the -2 reduction is a hand-resident would-digivolve modifier.
import { EffectTiming, isTamer, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { digivolveCostStatic } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Insectoid",
                  "Ten Warriors"
                ],
                "match": "trait"
              }
            ]
          },
          "payCost": true,
          "from": [
            "hand"
          ],
          "costOverride": 3,
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Hybrid",
                    "Insectoid"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "a card with [Hybrid] or [Insectoid] in its traits is in this Digimon's digivolution cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

const cardId = "BT7-051";
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
