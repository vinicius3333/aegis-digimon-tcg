import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST16-15";

function hasMattIshida(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
    if (permanent.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(permanent.topCard);
    return isTamer(definition) && definition.nameEn.includes("Matt Ishida");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/matt-color-waiver`,
          description: "While you have a Tamer with [Matt Ishida] in its name, waive this Option's color requirement.",
          when: (ctx) => hasMattIshida(ctx, source),
          resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.Permanent),
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Return 1 Digimon card from your trash to your hand. Then, 1 of your Digimon with [Garurumon] in its name gains '[On Deletion] You may play this card without paying the cost.' until the end of your opponent's turn.",
          optional: false,
          resolve: async (ctx) => {
            const trash = ctx.game.player(source.ownerSeat).trash.filter((card) =>
              isDigimon(ctx.game.definitionOf(card)),
            );
            if (trash.length === 0) return;
            const [returned] = await ctx.ask.selectCards(ctx, {
              candidates: trash.map((card) => card.instanceId),
              min: 1,
              max: 1,
            });
            if (returned !== undefined) await ctx.fx.returnToHand([returned]);

            const garurumon = ctx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
              if (permanent.topCard === undefined) return false;
              const definition = ctx.game.definitionOf(permanent.topCard);
              return isDigimon(definition) && definition.nameEn.includes("Garurumon");
            });
            if (garurumon.length === 0) return;
            const [chosen] = await ctx.ask.chooseTargets(ctx, {
              candidates: garurumon.map((permanent) => permanent.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen !== undefined) {
              const permanent = ctx.game.permanentById(chosen);
              const top = permanent?.topCard;
              if (top !== undefined) {
                ctx.fx.grantCustomEffect?.(
                  top.instanceId,
                  source.ownerSeat,
                  "OnDeletionPlaySelfMandatory",
                  EffectDuration.UntilOpponentTurnEnd,
                );
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => {
            const effects = module.effectsForTiming(EffectTiming.OnUseOption, source);
            for (const effect of effects) await effect.resolve(ctx);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
