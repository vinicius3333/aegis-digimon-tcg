// @ts-nocheck
import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { securityStatic } from "../../engine/effects/builders.js";
import { registerCard, unregisterCard } from "../../engine/effects/registry.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine"
            },
            "raw": "you have no face-up security cards"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "amount": 1000,
          "duration": "permanent",
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "faceDown": true
            },
            "unit": "digivolutionCardsOfFiltered"
          }
        }
      ],
      "isSecurity": true
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": false
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "toTop": false,
          "faceUp": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "playCostLte": 5,
              "nameOrTrait": [
                {
                  "tokens": [
                    "DM"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

const irModule = registerIrCard("EX9-072", compiled);
const module: EffectModule = {
  cardId: "EX9-072",
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = irModule.effectsForTiming(timing, source);
    if (timing !== EffectTiming.None) return effects;
    return [
      ...effects.filter((effect) => effect.irTrigger !== "AllTurns"),
      securityStatic({
        source,
        effectKey: "EX9-072/security-all-turns-dp",
        description: "[Security][All Turns] Your Digimon with the [DM] trait get +1000 DP for each face-down digivolution card.",
        optional: false,
        resolve: async (ctx) => {
          for (const permanent of ctx.game.player(source.ownerSeat).battleArea) {
            if (permanent.topCard === undefined) continue;
            const definition = ctx.game.definitionOf(permanent.topCard);
            if (!isDigimon(definition) || !(definition.types ?? []).includes("DM")) continue;
            const faceDownCount = permanent.stack.filter((card) => card.faceUp !== true).length;
            if (faceDownCount > 0) ctx.fx.modifyDP(permanent.permanentId, 1000 * faceDownCount, EffectDuration.UntilEachTurnEnd, { continuous: true });
          }
        },
      }),
    ];
  },
};
unregisterCard("EX9-072");
registerCard(module);
