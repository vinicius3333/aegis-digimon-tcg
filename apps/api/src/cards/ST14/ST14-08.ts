import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { mill } from "./support.js";

const cardId = "ST14-08";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/mill`,
          description: "[When Digivolving] Trash the top 4 cards of your deck.",
          resolve: (ctx) => mill(ctx, source, 4),
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/memory-on-mill`,
        description: "[All Turns][Once Per Turn] When your deck is trashed, gain 1 memory per 10 cards in trash.",
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const self = source.permanent();
          if (!self) return;
          ctx.fx.subscribeSubTrigger({
            event: "onDiscardLibrary",
            sourcePermanentId: self.permanentId,
            once: false,
            description: `${cardId}: gain memory`,
            matches: (subCtx) => subCtx.trigger.addedToHand?.byEffect?.ownerSeat === source.ownerSeat,
            run: async (subCtx) =>
              subCtx.fx.gainMemory(Math.floor(subCtx.game.player(source.ownerSeat).trash.length / 10)),
          });
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/security-attack-on-mill`,
        description: "[Your Turn][Once Per Turn] When your deck is trashed, gain Security Attack +1 for the turn.",
        maxPerTurn: 1,
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (!self) return;
          ctx.fx.subscribeSubTrigger({
            event: "onDiscardLibrary",
            sourcePermanentId: self.permanentId,
            once: false,
            description: `${cardId}: security attack`,
            matches: (subCtx) => subCtx.trigger.addedToHand?.byEffect?.ownerSeat === source.ownerSeat,
            run: async (subCtx) =>
              subCtx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1),
          });
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
