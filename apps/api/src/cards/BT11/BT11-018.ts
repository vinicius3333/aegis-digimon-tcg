import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-018";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rules`,
          description: "Also OmniShoutmon/ZeigGreymon; Material Save 2.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.grantNameTrait(self.permanentId, "name", ["OmniShoutmon", "ZeigGreymon"], EffectDuration.Permanent);
            ctx.fx.grantKeyword(self.permanentId, "MaterialSave", EffectDuration.Permanent, 2);
          },
        }),
      ];
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] Delete an opposing 8000-DP-or-less Digimon; an opposing Digimon can't attack through its next turn.",
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const digimon = ctx.game
              .player(opponent)
              .battleArea.filter((p) => p.topCard && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon));
            const deletable = digimon.filter((p) => p.currentDP <= 8000);
            if (deletable.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: deletable.map(({ permanentId }) => permanentId),
                min: 1,
                max: 1,
              });
              await ctx.fx.deletePermanent(chosen, "byEffect");
            }
            const remaining = ctx.game
              .player(opponent)
              .battleArea.filter((p) => p.topCard && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon));
            if (remaining.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: remaining.map(({ permanentId }) => permanentId),
                min: 1,
                max: 1,
              });
              if (chosen[0]) ctx.fx.restrict(chosen[0], "attack", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    if (timing === EffectTiming.OnEndAttack)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-attack`,
          description: "[End of Attack] By deleting this Digimon, gain 1 memory.",
          optional: true,
          canActivate: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self && (await ctx.fx.deletePermanent([self.permanentId], "byEffect")) === 1) ctx.fx.gainMemory(1);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
