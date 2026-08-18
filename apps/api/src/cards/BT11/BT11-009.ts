import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-009";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [staticModifier({
        source,
        effectKey: `${cardId}/material-save`,
        description: "＜Material Save 1＞",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "MaterialSave", EffectDuration.Permanent, 1);
        },
      })];
    }
    if (timing === EffectTiming.OnPlay) {
      return [onPlay({
        source,
        effectKey: `${cardId}/on-play-dp-delete`,
        description:
          "[On Play] Give 1 opposing Digimon -3000 DP for the turn. Then, if DigiXrosing " +
          "with 2 cards, delete 1 opposing Digimon with 2000 DP or less.",
        resolve: async (ctx) => {
          const opponent = ctx.game.opponentOf(source.ownerSeat);
          const targets = ctx.game.player(opponent).battleArea.filter((permanent) =>
            permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard))
          );
          if (targets.length > 0) {
            const [chosen] = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map(({ permanentId }) => permanentId), min: 1, max: 1,
            });
            if (chosen !== undefined) ctx.fx.modifyDP(chosen, -3000, EffectDuration.UntilEachTurnEnd);
          }
          if (ctx.trigger.digiXrosMaterialCount !== 2) return;
          const deletable = ctx.game.player(opponent).battleArea.filter((permanent) =>
            permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)) && permanent.currentDP <= 2000
          );
          if (deletable.length === 0) return;
          const [chosen] = await ctx.ask.chooseTargets(ctx, {
            candidates: deletable.map(({ permanentId }) => permanentId), min: 1, max: 1,
          });
          if (chosen !== undefined) await ctx.fx.deletePermanent([chosen]);
        },
      })];
    }
    return [];
  },
};

registerCard(module);
export default module;
