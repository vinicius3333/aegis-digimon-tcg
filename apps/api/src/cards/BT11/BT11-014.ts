import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-014";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({ source, effectKey: `${cardId}/raid`, description: "＜Raid＞", resolve: async (ctx) => { const self = source.permanent(); if (self) ctx.fx.grantKeyword(self.permanentId, "Raid", EffectDuration.Permanent); } }),
      staticModifier({ source, effectKey: `${cardId}/inherited-target-switch-security`, isInherited: true, when: () => source.isOwnersTurn(),
        description: "[Your Turn][Once Per Turn] When this Digimon's attack target is switched, trash the top opposing security.",
        resolve: async (ctx) => { const host = source.permanent(); if (!host) return; ctx.fx.subscribeSubTrigger({ event: "whenAttackTargetSwitched", sourcePermanentId: host.permanentId, once: false,
          oncePerTurnKey: `${source.instanceId}/${cardId}/target-switch-security`, description: `${cardId}: target switched`,
          matches: (subCtx) => subCtx.trigger.attackerPermanentId === host.permanentId,
          run: async (subCtx) => { await subCtx.fx.trashFromSecurity(subCtx.game.opponentOf(source.ownerSeat), 1, { fromTop: true }); } }); },
      }),
    ];
  },
};
registerCard(module);
export default module;
