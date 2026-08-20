import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT25-061 — Offmon.
 *
 * The committed catalog is authoritative; the local knowledge base has no card-specific
 * Q&A or errata. Alternate evolution and Link requirements are structural catalog data.
 * The start-main payment is indivisible and grants both benefits only after a real trash.
 * The linked face fires only when this exact physical Offmon was newly linked.
 */
const cardId = "BT25-061";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-trash-draw-memory`,
          description: "By trashing 1 [Appmon] card from hand, ＜Draw 1＞ and gain 1 memory.",
          optional: false,
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) =>
            ctx.game.player(source.ownerSeat).hand.some((card) => cardHasTrait(ctx.game.definitionOf(card), "Appmon")),
          resolve: async (ctx) => {
            const candidates = Array.from(ctx.game.player(source.ownerSeat).hand).filter((card) =>
              cardHasTrait(ctx.game.definitionOf(card), "Appmon"),
            );
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((card) => card.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length !== 1) return;
            const paid = await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat });
            if (paid.length !== 1 || paid[0]?.instanceId !== chosen[0]) return;
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/link-face-cant-unsuspend`,
          description: "[When Linking] 1 opposing Digimon can't unsuspend until their turn ends.",
          isLinked: true,
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: host.permanentId,
              once: false,
              description: `${cardId}: linked face [When Linking] can't unsuspend.`,
              matches: (subCtx) => subCtx.trigger?.linkedCardInstanceIds?.includes(source.instanceId) === true,
              run: async (subCtx) => {
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                const candidates = Array.from(subCtx.game.player(opponent).battleArea)
                  .filter((permanent) => {
                    if (permanent.inBreeding || permanent.topCard === undefined) return false;
                    return subCtx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Digimon);
                  })
                  .map((permanent) => permanent.permanentId);
                if (candidates.length === 0) return;
                const chosen =
                  candidates.length === 1
                    ? candidates
                    : await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 });
                if (chosen[0] !== undefined) {
                  subCtx.fx.restrict(chosen[0], "unsuspend", EffectDuration.UntilOpponentTurnEnd);
                }
              },
            });
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
