import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-025";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/security-attack`,
          description: "[When Digivolving] Security Attack +1 for the turn.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined)
              ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
          },
        }),
      ];
    }
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/disable-option-security`,
          description: "[Your Turn] Opposing Option Security effects don't activate while this Digimon attacks.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.disableSecurityEffect(self.permanentId, "option", EffectDuration.Permanent);
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
