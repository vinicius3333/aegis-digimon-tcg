import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-010";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({ source, effectKey: `${cardId}/raid`, description: "＜Raid＞", resolve: async (ctx) => {
        const self = source.permanent();
        if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Raid", EffectDuration.Permanent);
      } }),
      staticModifier({
        source, effectKey: `${cardId}/inherited-target-switch-dp`,
        description: "[Your Turn][Once Per Turn] When this Digimon's attack target is switched, it gets +3000 DP for the turn.",
        isInherited: true, when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent(); if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({ event: "whenAttackTargetSwitched", sourcePermanentId: host.permanentId,
            once: false, oncePerTurnKey: `${source.instanceId}/${cardId}/target-switch-dp`, description: `${cardId}: target switched`,
            matches: (subCtx) => subCtx.trigger.attackerPermanentId === host.permanentId,
            run: async (subCtx) => subCtx.fx.modifyDP(host.permanentId, 3000, EffectDuration.UntilEachTurnEnd) });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
