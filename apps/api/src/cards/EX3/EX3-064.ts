import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// EX3-064 Megidramon — official errata applied. Trial provenance raises the
// On Play ceiling from level 5 to 6; On Deletion places Trial as an Option
// permanent, so its own [Main] effect is not activated (KB Q3428).
const cardId = "EX3-064";
function hasTrialInPlay(game: GameAccess, source: CardSource): boolean {
  return Array.from(game.player(source.ownerSeat).battleArea).some(({ topCard }) => topCard?.cardId === "EX3-069");
}

function trialHandIds(game: GameAccess, source: CardSource): string[] {
  return Array.from(game.player(source.ownerSeat).hand)
    .filter(({ cardId: instanceCardId }) => instanceCardId === "EX3-069")
    .map(({ instanceId }) => instanceId);
}

function handIds(game: GameAccess, source: CardSource): string[] {
  return Array.from(game.player(source.ownerSeat).hand).map(({ instanceId }) => instanceId);
}

function opponentTargets(ctx: EffectContext, source: CardSource, maximumLevel: number): Permanent[] {
  return Array.from(ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea).filter((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(permanent.topCard);
    return isDigimon(definition) && definition.level !== undefined && definition.level <= maximumLevel;
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rule-chaosgallantmon-name`,
          description: "(Rule) Name: Also treated as [ChaosGallantmon].",
          when: () => true,
          resolve: async (ctx) => {
            const permanent = source.permanent();
            if (permanent !== undefined) {
              ctx.fx.grantNameTrait(permanent.permanentId, "name", ["ChaosGallantmon"], EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-delete`,
          description:
            "[On Play] Delete 1 of your opponent's level 5 or lower Digimon. If this card was played by " +
            "[Trial of the Four Great Dragons]'s effect, add 1 to the maximum level.",
          optional: false,
          resolve: async (ctx) => {
            const maximumLevel = ctx.trigger.playedByEffectSourceCardId === "EX3-069" ? 6 : 5;
            const candidates = opponentTargets(ctx, source, maximumLevel).map(({ permanentId }) => permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            await ctx.fx.deletePermanent(chosen);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-place-trial`,
          description:
            "[On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you may place " +
            "1 [Trial of the Four Great Dragons] from your hand in your battle area.",
          optional: true,
          canActivate: (ctx) => !hasTrialInPlay(ctx.game, source) && trialHandIds(ctx.game, source).length > 0,
          resolve: async (ctx) => {
            if (hasTrialInPlay(ctx.game, source)) return;
            const candidates = trialHandIds(ctx.game, source);
            if (candidates.length === 0) return;
            const [chosen] = await ctx.ask.selectCards(ctx, {
              candidates,
              visible: handIds(ctx.game, source),
              min: 1,
              max: 1,
            });
            if (chosen !== undefined) await ctx.fx.placeOptionAsPermanent?.(chosen);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
