import { CardKind, EffectTiming, type CompiledCard } from "@aegis/shared";
import { digivolveCostStatic } from "../../engine/effects/builders.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// Hand-authored IR for BT7-025 (Beowolfmon).
//
// Fixes from the audit:
//
// 1. The [Static] SubTrigger sourceFilter must gate on the digivolving Digimon having
//    a Tamer card in its digivolution cards. The prior IR used { zone: "hand" } which is
//    the destination card zone, not a property of the source Digimon, and it did not encode
//    the Tamer-in-stack condition at all. The new IR uses the existing
//    `digivolutionStackKind: ["Tamer"]` filter field (interpreter.ts, BT17-090 precedent).
//
// 2. The [When Attacking] sequence:
//    - Cost: return a card with [Hybrid] in its traits from THIS DIGIMON'S digivolution
//      cards (zone: digivolutionCards, hostFilter: isSelfRef) — previously targeted any
//      of your Digimon generically.
//    - Effect: "Trash all of the digivolution cards of THAT Digimon (the returned one)."
//      Per BT4-032's established pattern, TrashDigivolution must execute BEFORE Return
//      (stack is still accessible), then Return reuses the same target via `sameTarget:
//      true` (CAP-A9), which reads `ctx.lastResolvedPermanentIds` set by TrashDigivolution's
//      own target resolution.
//    - The original IR had a backwards order (Return first, then Trash all my own Digimon).
//
// 3. "You may return 1 card ... to return 1 of your opponent's ..." makes the WHOLE
//    effect optional, not just the cost payment. TrashDigivolution now carries
//    `abortOnDecline: true` alongside `optional: true` so declining the "you may" prompt
//    skips the Return action too, instead of leaving it to fire unconditionally for free.

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "amount": "all",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "hostFilter": {
                  "isSelfRef": true
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Hybrid"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by returning 1 card with [Hybrid] in its traits from this Digimon's digivolution cards to your hand"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1,
            "sameTarget": true
          },
          "to": "hand"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

const cardId = "BT7-025";
const interpreted = irCardModule(cardId, compiled);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return interpreted.effectsForTiming(timing, source);
    return [
      digivolveCostStatic({
        source,
        effectKey: `${cardId}/tamer-source-cost-reduction`,
        description:
          "When one of your Digimon with a Tamer in its digivolution cards digivolves into this card, reduce the cost by 2.",
        when: (ctx) => ctx.game.player(source.ownerSeat).hand.some((card) => card.instanceId === source.instanceId),
        resolve: async (ctx) => {
          ctx.fx.changeEvoCost(
            ({ target, into }) =>
              target.controllerSeat === source.ownerSeat &&
              into?.cardId === cardId &&
              target.stack.some((card) => ctx.game.definitionOf(card).kinds.includes(CardKind.Tamer)),
            -2,
          );
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
