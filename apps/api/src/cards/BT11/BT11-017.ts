import { CardColor, CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-017";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.None) return [staticModifier({
      source, effectKey: `${cardId}/raid`, description: "Raid",
      resolve: async (ctx) => { const self = source.permanent(); if (self) ctx.fx.grantKeyword(self.permanentId, "Raid", EffectDuration.Permanent); },
    })];
    if (timing === EffectTiming.WhenDigivolving) return [turnTiming({
      source, effectKey: `${cardId}/blitz`, description: "[When Digivolving] Blitz.",
      resolve: async (ctx) => { const self = source.permanent(); if (self) ctx.fx.grantKeyword(self.permanentId, "Blitz", EffectDuration.UntilOwnerTurnEnd); },
    })];
    if (timing === EffectTiming.OnAttackTargetChanged) return [turnTiming({
      source, effectKey: `${cardId}/target-switch`, description: "[Your Turn][Once Per Turn] When an attack target switches, unsuspend and gain 1 per red Tamer.", maxPerTurn: 1,
      when: () => source.isOwnersTurn(),
      resolve: async (ctx) => {
        const self = source.permanent();
        if (!self) return;
        await ctx.fx.unsuspend([self.permanentId]);
        const tamers = ctx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
          if (!permanent.topCard) return false;
          const def = ctx.game.definitionOf(permanent.topCard);
          return def.kinds.includes(CardKind.Tamer) && def.colors.includes(CardColor.Red);
        }).length;
        if (tamers > 0) ctx.fx.gainMemory(tamers);
      },
    })];
    return [];
  },
};
registerCard(module);
export default module;
