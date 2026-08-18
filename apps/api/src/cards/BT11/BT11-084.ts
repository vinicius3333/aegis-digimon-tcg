import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-084";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/draw-two-trash-two`,
          description: "[When Digivolving] Draw 2. Then, trash 2 cards in your hand.",
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 2);
            const candidates = ctx.game.player(source.ownerSeat).hand.map(({ instanceId }) => instanceId);
            const count = Math.min(2, candidates.length);
            if (count === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: count, max: count });
            if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/retaliation`,
        description: "＜Retaliation＞",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Retaliation", EffectDuration.Permanent);
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-memory-on-effect-play`,
        description: "Inherited [All Turns][Once Per Turn] When you play a Digimon by an effect, gain 1 memory.",
        isInherited: true,
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenPlayed",
            sourcePermanentId: host.permanentId,
            once: false,
            description: "BT11-084 inherited memory gain",
            oncePerTurnKey: `${source.instanceId}/${cardId}/inherited-memory`,
            matches: (subCtx) => {
              if (subCtx.trigger.playedByEffect !== true) return false;
              const playedId = subCtx.trigger.subjectPermanentId;
              return playedId !== undefined && subCtx.game.permanentById(playedId)?.controllerSeat === source.ownerSeat;
            },
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
