import { EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-082";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/play-damemon`,
          description: "[On Deletion] You may play a Damemon from trash suspended without paying its cost.",
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) => ctx.game.definitionOf(card).nameEn.includes("Damemon"));
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map(({ instanceId }) => instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length !== 1) return;
            const played = await ctx.fx.playInstances(chosen, { payCost: false });
            if (played[0] !== undefined)
              await ctx.fx.suspend([played[0].permanentId], { byEffectSeat: source.ownerSeat });
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/decoy`,
        description: "＜Decoy ([Bagra Army])＞",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Decoy", EffectDuration.Permanent);
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/protect-yuu`,
        description: "[All Turns] All of your Yuu Amano can't be deleted.",
        resolve: async (ctx) => {
          for (const permanent of ctx.game.player(source.ownerSeat).battleArea) {
            if (
              permanent.topCard !== undefined &&
              isTamer(ctx.game.definitionOf(permanent.topCard)) &&
              ctx.game.definitionOf(permanent.topCard).nameEn.includes("Yuu Amano")
            ) {
              ctx.fx.restrict(permanent.permanentId, "beDeleted", EffectDuration.Permanent);
            }
          }
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-memory`,
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
            description: "BT11-082 inherited memory",
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
