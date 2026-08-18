import { EffectTiming, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { onDeletion, onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-077";
function bagra(definition: CardDefinition): boolean {
  return [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])].includes(
    "Bagra Army",
  );
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/delete-reveal`,
          description: "[On Play] Delete this Digimon to reveal 5, add a Bagra Army card and bottom-deck the rest.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined || (await ctx.fx.deletePermanent([self.permanentId], "byEffect")) !== 1) return;
            const revealed = await ctx.fx.reveal(source.ownerSeat, 5);
            const eligible = revealed.filter((card) => bagra(ctx.game.definitionOf(card)));
            let chosen: string[] = [];
            if (eligible.length > 0)
              chosen = await ctx.ask.selectCards(ctx, {
                candidates: eligible.map(({ instanceId }) => instanceId),
                min: 1,
                max: 1,
              });
            if (chosen.length > 0) await ctx.fx.returnToHand(chosen);
            const rest = revealed
              .filter(({ instanceId }) => !chosen.includes(instanceId))
              .map(({ instanceId }) => instanceId);
            if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
          },
        }),
      ];
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/save`,
          description: "[On Deletion] ＜Save＞",
          resolve: async (ctx) => {
            const tamers = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (permanent) => permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard)),
              )
              .map(({ permanentId }) => permanentId);
            if (tamers.length === 0 || !(await ctx.ask.optional(ctx, "Save this card under a Tamer?"))) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: tamers, min: 1, max: 1 });
            if (chosen[0] !== undefined) await ctx.fx.placeUnder(chosen[0], [source.instanceId], { belowTop: true });
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-memory-when-trashed`,
        description: "Inherited [Opponent's Turn] When an effect trashes this source, gain 1 memory.",
        isInherited: true,
        when: () => !source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "onDigivolutionCardDiscarded",
            sourcePermanentId: host.permanentId,
            once: false,
            description: "BT11-077 inherited memory",
            matches: (subCtx) =>
              !source.isOwnersTurn() && subCtx.trigger.trashedDigivolutionInstanceId === source.instanceId,
            run: async (subCtx) => {
              subCtx.fx.gainMemory(1);
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
