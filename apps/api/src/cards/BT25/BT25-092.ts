import { CardKind, EffectTiming, isDigimon, type CardDefinition, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT25-092 Asuna Shiroki — Q6434/Q6435 faithful cost and evolution handling. */
const cardId = "BT25-092";

function hasTsOrThreeMusketeersText(def: CardDefinition): boolean {
  const text = [def.effectText, def.inheritedEffectText, def.securityEffectText, def.linkEffect]
    .filter(Boolean)
    .join("\n");
  return (def.types ?? []).includes("TS") || text.includes("Three Musketeers");
}

function optionUnderOwnDigimons(ctx: EffectContext, source: CardSource): { hostId: string; card: CardInstance }[] {
  const found: { hostId: string; card: CardInstance }[] = [];
  for (const host of ctx.game.player(source.ownerSeat).battleArea) {
    if (host.topCard === undefined || !isDigimon(ctx.game.definitionOf(host.topCard))) continue;
    for (const card of host.stack) {
      if (ctx.game.definitionOf(card).kinds.includes(CardKind.Option)) found.push({ hostId: host.permanentId, card });
    }
  }
  return found;
}

async function offerEvolution(ctx: EffectContext, source: CardSource): Promise<void> {
  if (!(await ctx.ask.optional(ctx, "Digivolve 1 of your Digimon with the cost reduced by 1?"))) return;
  const owner = ctx.game.player(source.ownerSeat);
  const hosts = owner.battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
  const cards = [...owner.hand, ...owner.trash].filter((card) => {
    const def = ctx.game.definitionOf(card);
    return isDigimon(def) && hasTsOrThreeMusketeersText(def);
  });
  if (hosts.length === 0 || cards.length === 0) return;
  const hostId =
    hosts.length === 1
      ? hosts[0]!.permanentId
      : (await ctx.ask.chooseTargets(ctx, { candidates: hosts.map((p) => p.permanentId), min: 1, max: 1 }))[0];
  const cardId =
    cards.length === 1
      ? cards[0]!.instanceId
      : (await ctx.ask.selectCards(ctx, { candidates: cards.map((card) => card.instanceId), min: 1, max: 1 }))[0];
  if (hostId !== undefined && cardId !== undefined)
    await ctx.fx.digivolveFromInstance(hostId, cardId, { payCost: true, costDelta: -1 });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-trash-draw-memory`,
          description: "[Start of Your Main Phase] Trash a Three Musketeers-text or TS card; Draw 1 and gain 1 memory.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .hand.some((card) => hasTsOrThreeMusketeersText(ctx.game.definitionOf(card))),
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .hand.filter((card) => hasTsOrThreeMusketeersText(ctx.game.definitionOf(card)));
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length !== 1 || (await ctx.fx.trash(chosen)).length !== 1) return;
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];

    if (timing === EffectTiming.OnDeclaration)
      return [
        activated({
          source,
          effectKey: `${cardId}/main-paid-digivolve`,
          description:
            "[Main] Suspend this Tamer and trash exactly 1 Option from hand or your Digimon's sources; may digivolve at -1.",
          optional: true,
          canActivate: (ctx) => {
            const self = source.permanent();
            const hand = ctx.game
              .player(source.ownerSeat)
              .hand.some((card) => ctx.game.definitionOf(card).kinds.includes(CardKind.Option));
            return self !== undefined && !self.isSuspended && (hand || optionUnderOwnDigimons(ctx, source).length > 0);
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined || self.isSuspended) return;
            const hand = ctx.game
              .player(source.ownerSeat)
              .hand.filter((card) => ctx.game.definitionOf(card).kinds.includes(CardKind.Option));
            const under = optionUnderOwnDigimons(ctx, source);
            const all = [...hand.map((card) => card.instanceId), ...under.map(({ card }) => card.instanceId)];
            const chosen = await ctx.ask.selectCards(ctx, { candidates: all, min: 0, max: 1 });
            if (chosen.length !== 1) return;
            const fromHand = hand.some((card) => card.instanceId === chosen[0]);
            const moved = fromHand
              ? await ctx.fx.trash(chosen)
              : await ctx.fx.trashDigivolutionCards(
                  under.find(({ card }) => card.instanceId === chosen[0])!.hostId,
                  chosen,
                );
            if (moved.length !== 1) return;
            if ((await ctx.fx.suspend([self.permanentId])).length !== 1) return;
            await offerEvolution(ctx, source);
          },
        }),
      ];

    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card free.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    return [];
  },
};

registerCard(module);
export default module;
