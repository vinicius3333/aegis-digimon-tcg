import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT3-092";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          optional: false,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantPierce(self.permanentId, EffectDuration.Permanent);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/memory-for-each-other-deletion`,
          description: "[All Turns] When another Digimon is deleted, gain 1 memory for each Digimon deleted.",
          optional: false,
          when: (ctx) => {
            const deletedIds = ctx.trigger?.deletedInstanceIds ?? [];
            return deletedIds.some((instanceId) => instanceId !== source.instanceId);
          },
          resolve: async (ctx) => {
            const deletedIds = ctx.trigger?.deletedInstanceIds ?? [];
            const stackIds = new Set(ctx.trigger?.deletedWasStackInstanceIds ?? []);
            let deletedDigimonCount = 0;
            for (const player of ctx.game.state.players) {
              for (const card of player.trash) {
                if (!deletedIds.includes(card.instanceId)) continue;
                if (stackIds.has(card.instanceId) || card.instanceId === source.instanceId) continue;
                if (isDigimon(ctx.game.definitionOf(card))) deletedDigimonCount += 1;
              }
            }
            if (deletedDigimonCount > 0) ctx.fx.gainMemory(deletedDigimonCount);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
