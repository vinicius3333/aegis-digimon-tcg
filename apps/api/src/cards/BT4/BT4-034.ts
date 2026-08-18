import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT4-034";

function opponentDigimonsWithDigivolutionCards(
  ctx: EffectContext,
  source: CardSource,
): Permanent[] {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponent).battleArea).filter((permanent) => {
    if (permanent.topCard === undefined) return false;
    if (!isDigimon(ctx.game.definitionOf(permanent.topCard))) return false;
    return permanent.stack.length >= 1;
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Attacking] Trash the bottom digivolution card of 1 of your opponent's
    // Digimon. When you do, trigger <Draw 1> (Draw 1 card) and gain 1 memory.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-trash-digi-card`,
          description:
            "[When Attacking] Trash the bottom digivolution card of 1 of your opponent's " +
            "Digimon. When you do, trigger ＜Draw 1＞ and gain 1 memory.",
          optional: false,
          canActivate: (ctx) =>
            source.isOnBattleArea() &&
            opponentDigimonsWithDigivolutionCards(ctx, source).length > 0,
          resolve: async (ctx) => {
            const eligiblePermanents = opponentDigimonsWithDigivolutionCards(ctx, source);
            if (eligiblePermanents.length === 0) return;

            // Pick 1 opponent Digimon (canNoSelect: false — must pick if any exist).
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: eligiblePermanents.map((permanent) => permanent.permanentId),
              min: 1,
              max: 1,
            });
            const chosenPermanentId = chosen[0];
            if (chosenPermanentId === undefined) return;

            const targetPermanent = eligiblePermanents.find(
              (permanent) => permanent.permanentId === chosenPermanentId,
            );
            if (targetPermanent === undefined) return;

            // → trash the BOTTOM card of the digivolution stack.
            const bottomCard = targetPermanent.stack[0];
            if (bottomCard === undefined) return;

            const trashed = await ctx.fx.trashDigivolutionCards(
              targetPermanent.permanentId,
              [bottomCard.instanceId],
              { byEffectSeat: source.ownerSeat },
            );

            // "When you do" — only if a card was actually trashed (Q1201).
            if (trashed.length > 0) {
              await ctx.fx.draw(source.ownerSeat, 1);
              ctx.fx.gainMemory(1);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
