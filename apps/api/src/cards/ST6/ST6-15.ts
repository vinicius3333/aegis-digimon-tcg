import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST6-15";

function opposingLevelFourOrLower(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter((permanent) => {
      if (permanent.topCard === undefined) return false;
      const definition = ctx.game.definitionOf(permanent.topCard);
      return isDigimon(definition) && (definition.level ?? Number.POSITIVE_INFINITY) <= 4;
    })
    .map(({ permanentId }) => permanentId);
}

async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const ownCandidates = ctx.game
    .player(source.ownerSeat)
    .battleArea.filter(
      (permanent) =>
        permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    )
    .map(({ permanentId }) => permanentId);
  const opposingCandidates = opposingLevelFourOrLower(ctx, source);
  if (ownCandidates.length === 0 || opposingCandidates.length === 0) return;

  const [own] = await ctx.ask.chooseTargets(ctx, { candidates: ownCandidates, min: 1, max: 1 });
  if (own === undefined) return;
  const [opposing] = await ctx.ask.chooseTargets(ctx, {
    candidates: opposingCandidates,
    min: 1,
    max: 1,
  });
  if (opposing === undefined) return;

  // Q676/Q677: finish Death Claw's deletion before either [On Deletion] resolves. Passing
  // both permanents to one primitive call moves them simultaneously and opens one ordered
  // OnDestroyedAnyone window only after both have left the field.
  await ctx.fx.deletePermanent([own, opposing], "byEffect");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] You may delete 1 of your Digimon to delete 1 opposing level 4 or lower Digimon.",
          optional: true,
          resolve: (ctx) => resolveMain(ctx, source),
        }),
      ];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Delete 1 opposing level 4 or lower Digimon.",
          resolve: async (ctx) => {
            const candidates = opposingLevelFourOrLower(ctx, source);
            if (candidates.length === 0) return;
            const [chosen] = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen !== undefined) await ctx.fx.deletePermanent([chosen], "byEffect");
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
