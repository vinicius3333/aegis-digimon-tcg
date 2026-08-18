import { CardColor, EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-115";
const hasTamer = (ctx: Parameters<Effect["canTrigger"]>[0], source: CardSource, blueOnly = false): boolean =>
  ctx.game
    .player(source.ownerSeat)
    .battleArea.some(
      (p) =>
        p.topCard !== undefined &&
        isTamer(ctx.game.definitionOf(p.topCard)) &&
        (!blueOnly || ctx.game.definitionOf(p.topCard).colors.includes(CardColor.Blue)),
    );
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/unsuspend`,
          description: "[When Attacking][Once Per Turn] If you have a Tamer, unsuspend this Digimon.",
          maxPerTurn: 1,
          canActivate: (ctx) => hasTamer(ctx, source),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.unsuspend([self.permanentId]);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blue-tamer-dp`,
          description: "[All Turns] While you have a blue Tamer, this Digimon gets +1000 DP.",
          isInherited: true,
          when: (ctx) => hasTamer(ctx, source, true),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self) ctx.fx.modifyDP(self.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
