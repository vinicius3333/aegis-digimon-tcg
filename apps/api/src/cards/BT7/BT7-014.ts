// HAND-FIXED — preserve: the -2 reduction is a hand-resident would-digivolve modifier.
import { EffectTiming, isTamer, type CompiledCard } from "@aegis/shared";
import { digivolveCostStatic } from "../../engine/effects/builders.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// Aldamon shares the BT7 hand-resident cost-reduction contract with Beowolfmon,
// JetSilphymon, RhinoKabuterimon and Rhihimon. A future-event SubTrigger cannot model
// a cost change that must exist before the digivolution is paid, so install the modifier
// directly while this exact card instance remains in its owner's hand.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 4000,
          "duration": "forTheTurn",
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
          }
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "noSecurityOptionEffects",
          "duration": "permanent",
          "condition": {
            "kind": "selfHasTrait",
            "filter": {
              "nameOrTrait": [{ "tokens": ["Hybrid", "Ten Warriors"], "match": "trait" }]
            },
            "raw": "this Digimon has [Hybrid] or [Ten Warriors] in its traits"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

const cardId = "BT7-014";
const interpreted = irCardModule(cardId, compiled);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...interpreted.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.None) return effects;

    effects.push(
      digivolveCostStatic({
        source,
        effectKey: `${cardId}/tamer-source-cost-reduction`,
        description:
          "When one of your Digimon with a Tamer in its digivolution cards digivolves " +
          "into this card, reduce the cost by 2.",
        when: (ctx) => ctx.game.player(source.ownerSeat).hand.some(
          (card) => card.instanceId === source.instanceId,
        ),
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
