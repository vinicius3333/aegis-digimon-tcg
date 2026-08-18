import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-070";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/dp-reboot`,
          description: "This Digimon gets +3000 DP and Reboot until the end of your opponent's turn.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilOpponentTurnEnd);
            ctx.fx.grantKeyword(self.permanentId, "Reboot", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/raid`,
        description: "＜Raid＞",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) ctx.fx.grantKeyword(self.permanentId, "Raid", EffectDuration.Permanent);
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/unsuspend-on-switch`,
        description: "[All Turns][Once Per Turn] If an attack target is switched, unsuspend this Digimon.",
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const self = source.permanent();
          if (!self) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenAttackTargetSwitched",
            sourcePermanentId: self.permanentId,
            once: false,
            description: `${cardId}: target switched`,
            run: async (subCtx) => subCtx.fx.unsuspend([self.permanentId]),
          });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
