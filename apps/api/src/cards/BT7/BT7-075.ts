import { CardColor, EffectTiming, isTamer } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { digivolveCostStatic, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT7-075";

function hasHybridTrait(ctx: EffectContext, instanceId: string): boolean {
  const card = ctx.game.player(ctx.source.ownerSeat).trash.find((candidate) => candidate.instanceId === instanceId);
  if (card === undefined) return false;
  const definition = ctx.game.definitionOf(card);
  return [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])]
    .includes("Hybrid");
}

function deletedStackHadHybrid(ctx: EffectContext): boolean {
  return (ctx.trigger.deletedWasStackInstanceIds ?? []).some((instanceId) => hasHybridTrait(ctx, instanceId));
}

function purpleTamersInTrash(ctx: EffectContext, source: CardSource) {
  return ctx.game.player(source.ownerSeat).trash.filter((card) => {
    const definition = ctx.game.definitionOf(card);
    return isTamer(definition) && definition.colors.includes(CardColor.Purple);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/tamer-source-cost-reduction`,
          description:
            "When a Digimon with a Tamer source digivolves into this card in your hand, " +
            "reduce the digivolution cost by 2.",
          optional: false,
          when: (ctx) => ctx.game.player(source.ownerSeat).hand.some(
            (card) => card.instanceId === source.instanceId,
          ),
          resolve: async (ctx) => {
            ctx.fx.changeEvoCost(
              ({ target, into }) => {
                if (target.controllerSeat !== source.ownerSeat || into?.cardId !== cardId) return false;
                return target.stack.some((card) => isTamer(ctx.game.definitionOf(card)));
              },
              -2,
            );
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/play-purple-tamer`,
          description:
            "[On Deletion] If this Digimon had a Hybrid source, you may play 1 purple " +
            "Tamer from your trash without paying its cost.",
          optional: true,
          canActivate: (ctx) => deletedStackHadHybrid(ctx) && purpleTamersInTrash(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = purpleTamersInTrash(ctx, source).map((card) => card.instanceId);
            if (candidates.length === 0) return;
            const selected = candidates.length === 1
              ? candidates
              : await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
            if (selected.length === 1) await ctx.fx.playInstances(selected, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
