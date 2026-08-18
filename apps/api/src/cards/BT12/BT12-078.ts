import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-078";
function hasWizardOrX(ctx: EffectContext, source: CardSource): boolean {
  return (
    source
      .permanent()
      ?.stack.some((card) =>
        matchNameOrTrait(ctx.game.definitionOf(card), { tokens: ["Wizardmon", "X Antibody"], match: "name" }),
      ) === true
  );
}
async function mill2(ctx: EffectContext, source: CardSource): Promise<void> {
  await ctx.fx.trash(
    ctx.game
      .player(source.ownerSeat)
      .deck.slice(0, 2)
      .map(({ instanceId }) => instanceId),
    { byEffectSeat: source.ownerSeat },
  );
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/mill-or-blocker`,
          description: "Trash 2 from deck, or gain Blocker instead with Wizardmon/X Antibody in stack.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (hasWizardOrX(ctx, source) && self)
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
            else await mill2(ctx, source);
          },
        }),
      ];
    if (timing === EffectTiming.OnAllyAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-mill`,
          description: "[When Attacking][Once Per Turn] Trash the top 2 cards of your deck.",
          isInherited: true,
          maxPerTurn: 1,
          resolve: (ctx) => mill2(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
