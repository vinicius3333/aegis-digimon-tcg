import { EffectTiming, appFusionCostFor, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security, turnTiming } from "../../engine/effects/builders.js";
import { linkCostOf } from "../../engine/effects/interpreter.js";
import { linkEligible } from "../../engine/effects/mindLink.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT25-089 Kazuki & Itsuki — audited against Q6422-Q6423. */
const cardId = "BT25-089";

function ownDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  return ctx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    return isDigimon(ctx.game.definitionOf(permanent.topCard));
  });
}

function linkCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  const pool = [...owner.hand, ...ownDigimon(ctx, source).flatMap((permanent) => Array.from(permanent.stack))].filter(
    (card): card is CardInstance => card !== undefined && card.cardId !== undefined,
  );
  return pool.filter((card) => {
    const definition = ctx.game.definitionOf(card);
    return isDigimon(definition) && cardHasTrait(definition, "Appmon") && linkEligible(definition);
  });
}

function fusionCardsFor(ctx: EffectContext, host: Permanent, source: CardSource): CardInstance[] {
  if (host.topCard === undefined) return [];
  const topName = ctx.game.definitionOf(host.topCard).nameEn;
  const linkedNames = Array.from(host.linked)
    .filter((card): card is CardInstance => card !== undefined && card.cardId !== undefined)
    .map((card) => ctx.game.definitionOf(card).nameEn);
  return ctx.game.player(source.ownerSeat).hand.filter((card) => {
    const definition = ctx.game.definitionOf(card);
    return isDigimon(definition) && appFusionCostFor(card.cardId, { topName, linkedNames }) !== undefined;
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.source.isOwnersTurn() &&
            ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.some(
                (permanent) =>
                  !permanent.inBreeding &&
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)),
              ),
          resolve: async (ctx) => ctx.fx.gainMemory(1),
        }),
      ];
    }

    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-link`,
          optional: true,
          description:
            "[Main] By suspending this Tamer, link an Appmon Digimon with a Link requirement from hand or sources at cost -2.",
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            return (
              self !== undefined &&
              !self.isSuspended &&
              linkCandidates(ctx, source).length > 0 &&
              ownDigimon(ctx, source).length > 0
            );
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const candidates = linkCandidates(ctx, source);
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((card) => card.instanceId),
              min: 1,
              max: 1,
            });
            const selected = candidates.find((card) => card.instanceId === chosen[0]);
            if (selected === undefined) return;
            const hosts = ownDigimon(ctx, source);
            const target = await ctx.ask.chooseTargets(ctx, {
              candidates: hosts.map((host) => host.permanentId),
              min: 1,
              max: 1,
            });
            if (target.length !== 1) return;
            const suspended = await ctx.fx.suspend([self.permanentId]);
            if (!suspended.includes(self.permanentId)) return;
            const cost = linkCostOf(ctx.game.definitionOf(selected), -2);
            if (cost > 0) ctx.fx.gainMemory(-cost);
            await ctx.fx.link(target[0]!, [selected.instanceId]);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-app-fusion`,
          optional: true,
          maxPerTurn: 1,
          description: "[End of Your Turn] [Once Per Turn] 1 of your Digimon may app fuse into a Digimon in hand.",
          when: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.source.isOwnersTurn() &&
            ownDigimon(ctx, source).some((host) => fusionCardsFor(ctx, host, source).length > 0),
          resolve: async (ctx) => {
            const hosts = ownDigimon(ctx, source).filter((host) => fusionCardsFor(ctx, host, source).length > 0);
            const chosenHost = await ctx.ask.chooseTargets(ctx, {
              candidates: hosts.map((host) => host.permanentId),
              min: 1,
              max: 1,
            });
            const host = hosts.find((candidate) => candidate.permanentId === chosenHost[0]);
            if (host === undefined) return;
            const cards = fusionCardsFor(ctx, host, source);
            const chosenCard = await ctx.ask.selectCards(ctx, {
              candidates: cards.map((card) => card.instanceId),
              min: 1,
              max: 1,
            });
            if (chosenCard.length !== 1) return;
            await ctx.fx.appFuseInto(host.permanentId, chosenCard[0]!);
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => ctx.fx.playFromSecurity(ctx.source.instanceId),
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
