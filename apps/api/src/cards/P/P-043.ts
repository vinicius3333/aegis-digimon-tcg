import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-043";

function isKentaurosmon(def: CardDefinition): boolean {
  return def.nameEn.includes("Kentaurosmon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] You may return 1 [Kentaurosmon] from your trash to the bottom of the " +
            "deck. If you do, place the top card of your deck on top of your security.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const kentCards = Array.from(owner.trash).filter((c) => isKentaurosmon(ctx.game.definitionOf(c)));
            if (kentCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: kentCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.returnToDeck(chosen, { toTop: false });
                if (owner.deck.length > 0) {
                  const topCard = Array.from(owner.deck)[0];
                  if (topCard !== undefined) {
                    await ctx.fx.addSecurity(source.ownerSeat, [topCard.instanceId], { toTop: true });
                  }
                }
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion`,
          description: "[On Deletion] [Inherited] 1 of your opponent's Digimon gets -1000 DP for the turn.",
          isInherited: true,
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const targets = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.modifyDP(chosen[0]!, -1000, EffectDuration.UntilEachTurnEnd);
              }
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
