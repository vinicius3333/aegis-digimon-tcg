import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT9-074 — Purple Lv.4 Digimon (BT9, Inherited: On Deletion gain 2 memory).
//
// [Security] Play this Digimon without paying its memory cost.
// [On Deletion] (inherited) If this Digimon has 2 or more colors, gain 2 memory.
//
//   CanActivateOnDeletion + CanAddMemory + cardColors.Count >= 2.
// The onDeletion builder's baseGuard already verifies the source was in the deleted set;
// canActivate adds the 2+-color check.

const cardId = "BT9-074";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this Digimon without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-memory`,
          description: "[On Deletion] If this Digimon has 2 or more colors, gain 2 memory.",
          isInherited: true,
          canActivate: (ctx) =>
            (ctx.trigger.deletedEffectiveColorsByInstanceId?.[source.instanceId]?.length ?? 0) >= 2,
          resolve: async (ctx) => {
            // [On Deletion] is unrestricted-turn (deletion can happen on either player's
            // turn, e.g. this Digimon dying in battle on the opponent's attack), so credit
            // this card's controller explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 2);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
