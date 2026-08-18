import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT10-057";
const BLOOM_TRAITS = new Set(["Vegetation", "Plant", "Fairy"]);

function isBloomTraitDigimon(ctx: EffectContext, permanentId: string): boolean {
  const permanent = ctx.game.permanentById(permanentId);
  if (permanent?.topCard === undefined) return false;
  const definition = ctx.game.definitionOf(permanent.topCard);
  return isDigimon(definition) && (definition.types ?? []).some((trait) => BLOOM_TRAITS.has(trait));
}

function ownDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game.player(source.ownerSeat).battleArea
    .filter((permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)))
    .map((permanent) => permanent.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/suspend-gain-memory-and-piercing`,
          description:
            "[When Digivolving] You may suspend 1 of your Digimon. Gain 1 memory for each suspended Vegetation, Plant, or Fairy Digimon. If you gain 2 or more, unsuspend this Digimon and it gains ＜Piercing＞ for the turn.",
          resolve: async (ctx) => {
            const candidates = ownDigimonIds(ctx, source).filter((id) => !ctx.game.permanentById(id)?.isSuspended);
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectPermanents(ctx, {
                candidates,
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) await ctx.fx.suspend(chosen);
            }

            const suspendedBloomDigimon = ownDigimonIds(ctx, source)
              .filter((id) => ctx.game.permanentById(id)?.isSuspended)
              .filter((id) => isBloomTraitDigimon(ctx, id)).length;
            if (suspendedBloomDigimon > 0) ctx.fx.gainMemory(suspendedBloomDigimon);
            if (suspendedBloomDigimon < 2) return;

            const self = source.permanent();
            if (self === undefined) return;
            await ctx.fx.unsuspend([self.permanentId]);
            ctx.fx.grantPierce(self.permanentId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/suspended-digimon-scaling`,
          description:
            "[Your Turn] For every 2 suspended Digimon you have, this Digimon gets +2000 DP and ＜Security Attack +1＞.",
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const groups = Math.floor(
              ownDigimonIds(ctx, source).filter((id) => ctx.game.permanentById(id)?.isSuspended).length / 2,
            );
            if (groups === 0) return;
            ctx.fx.modifyDP(self.permanentId, groups * 2000, EffectDuration.UntilEachTurnEnd);
            ctx.fx.grantKeyword(
              self.permanentId,
              "SecurityAttack",
              EffectDuration.UntilEachTurnEnd,
              groups,
            );
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
