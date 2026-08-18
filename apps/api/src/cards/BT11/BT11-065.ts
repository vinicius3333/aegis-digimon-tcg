import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-065";
const isNamed = (name: string, expected: string): boolean => name.toLowerCase().includes(expected.toLowerCase());

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/place-vemmon`,
          description: "[When Digivolving] Place up to 2 Vemmon from trash; with 4 Vemmon, return Fusionize.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const trash = ctx.game.player(source.ownerSeat).trash;
            const candidates = trash
              .filter((card) => isNamed(ctx.game.definitionOf(card).nameEn, "Vemmon"))
              .map(({ instanceId }) => instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: Math.min(2, candidates.length) });
            if (chosen.length > 0) await ctx.fx.placeUnder(self.permanentId, chosen, { belowTop: false });
            const current = ctx.game.permanentById(self.permanentId);
            if (
              current === undefined ||
              current.stack.filter((card) => isNamed(ctx.game.definitionOf(card).nameEn, "Vemmon")).length < 4
            )
              return;
            const fusionize = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) => isNamed(ctx.game.definitionOf(card).nameEn, "Fusionize"))
              .map(({ instanceId }) => instanceId);
            if (fusionize.length === 0) return;
            const picked = await ctx.ask.selectCards(ctx, { candidates: fusionize, min: 1, max: 1 });
            if (picked.length > 0) await ctx.fx.returnToHand(picked);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-bottom-deck-vemmon`,
          isInherited: true,
          description:
            "Inherited [All Turns][Once Per Turn] When Vemmon leaves this stack for deck bottom, unsuspend and gain Blocker.",
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onDigivolutionCardReturnToDeckBottom",
              sourcePermanentId: host.permanentId,
              once: false,
              oncePerTurnKey: `${source.instanceId}/${cardId}/blocker`,
              description: "BT11-065 inherited",
              matches: (subCtx) =>
                subCtx.trigger.subjectPermanentId === host.permanentId &&
                subCtx.trigger.returnedToDeckCardId === "BT11-061",
              run: async (subCtx) => {
                await subCtx.fx.unsuspend([host.permanentId]);
                subCtx.fx.grantKeyword(host.permanentId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
              },
            });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
