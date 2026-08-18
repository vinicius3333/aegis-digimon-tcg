// Hand-authored override for BT3-111 (Imperialdramon: Dragon Mode).
// runtime-effect fix: cost-reduction effect is hand-resident (this card is the digivolve TARGET in hand).
// Encodes as CostModifier with handResident:true + sourceFilter for Paildramon/Dinobeemon in
// battleArea only (KB Q1150: does not activate from breeding area).
// Errata: digivolves from Green Lv.5 cost 5 / Blue Lv.5 cost 5.
import { EffectTiming, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { digivolveCostStatic } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT3-111";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "permanent"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDeletesInBattle",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              }
            }
          ],
          "raw": "When this Digimon deletes an opponent's Digimon in battle and survives, unsuspend this Digimon."
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

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
          "When Paildramon or Dinobeemon digivolves into this card from hand, reduce the cost by 2.",
        when: (ctx) =>
          ctx.game.player(source.ownerSeat).hand.some((card) => card.instanceId === source.instanceId),
        resolve: async (ctx) => {
          ctx.fx.changeEvoCost(
            (match) => {
              if (
                match.into?.cardId !== cardId ||
                match.target.controllerSeat !== source.ownerSeat ||
                match.target.inBreeding
              ) {
                return false;
              }
              const baseName = ctx.game.definitionOf(match.target.topCard).nameEn;
              return baseName === "Paildramon" || baseName === "Dinobeemon";
            },
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
