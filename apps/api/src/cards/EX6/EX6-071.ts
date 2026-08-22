import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-071";

async function resolveMain(
  ctx: Parameters<NonNullable<Parameters<typeof activated>[0]["resolve"]>>[0],
  source: CardSource,
): Promise<void> {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const oppPlayer = ctx.game.player(opponent);
  const oppHandSize = oppPlayer.hand.length;

  if (oppHandSize >= 5) {
    const handCandidates = oppPlayer.hand.map((c) => c.instanceId);
    if (handCandidates.length > 0) {
      // but in the engine we have the effect controller (source player) select
      await ctx.fx.trash([handCandidates[0]!]);
    }
  }

  const deleteCandidates = Array.from(oppPlayer.battleArea)
    .filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      if (!isDigimon(def)) return false;
      return (def.level ?? 99) >= oppPlayer.hand.length;
    })
    .map((p) => p.permanentId);

  if (deleteCandidates.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: deleteCandidates,
      min: 1,
      max: 1,
    });
    if (chosen.length > 0) {
      await ctx.fx.deletePermanent(chosen);
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] If your opponent has 5 or more cards in their hand, your opponent " +
            "trashes 1 card in their hand. Then, delete 1 of your opponent's Digimon " +
            "with a level greater than or equal to the cards in their hand.",
          resolve: async (ctx) => {
            await resolveMain(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => {
            await resolveMain(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
