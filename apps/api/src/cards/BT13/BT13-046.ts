import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-046";

const securityCountAtMostSix = (ctx: EffectContext, source: CardSource): boolean => {
  const me = ctx.game.player(source.ownerSeat).security.length;
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).security.length;
  return me + opponent <= 6;
};

const opponentDigimon = (ctx: EffectContext, source: CardSource): Permanent[] =>
  ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter(
    (permanent: Permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
  );

async function gainAndRevealHandCard(ctx: EffectContext, source: CardSource): Promise<void> {
  ctx.fx.gainMemoryForSeat(source.ownerSeat, 3);
  const hand = [...(ctx.game.player(source.ownerSeat).hand as Iterable<CardInstance>)];
  if (hand.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, { candidates: hand.map((card) => card.instanceId), min: 1, max: 1 });
  const card = hand.find((candidate) => candidate.instanceId === chosen[0]);
  if (card === undefined) return;
  ctx.fx.revealCard(source.ownerSeat, card.cardId, cardId);
  if (ctx.game.definitionOf(card).colors.includes(CardColor.Yellow)) {
    await ctx.fx.addSecurity(source.ownerSeat, [card.instanceId], { toTop: true, faceUp: false });
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving) {
      const builder = timing === EffectTiming.OnPlay ? onPlay : whenDigivolving;
      return [builder({
        source,
        effectKey: `${cardId}/${timing}/security-six-reveal`,
        description: "If there're 6 or fewer total cards in both players' security stacks, gain 3 memory and reveal 1 card in your hand.",
        optional: false,
        canActivate: (ctx) => securityCountAtMostSix(ctx, source),
        resolve: (ctx) => gainAndRevealHandCard(ctx, source),
      })];
    }
    if (timing === EffectTiming.OnAllyAttack) {
      return [whenAttacking({
        source,
        effectKey: `${cardId}/when-attacking-trash-security`,
        description: "By trashing the top card of your security stack, unsuspend this Digimon, and 1 of your opponent's Digimon gets -7000 DP for the turn.",
        optional: true,
        canActivate: (ctx) => ctx.game.player(source.ownerSeat).security.length > 0,
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const trashed = await ctx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
          if (trashed.length === 0) return;
          const self = source.permanent();
          if (self !== undefined) ctx.fx.unsuspend([self.permanentId]);
          const targets = opponentDigimon(ctx, source);
          if (targets.length === 0) return;
          const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets.map((target) => target.permanentId), min: 1, max: 1 });
          if (chosen[0] !== undefined) ctx.fx.modifyDP(chosen[0], -7000, EffectDuration.UntilEachTurnEnd);
        },
      })];
    }
    return [];
  },
};

registerCard(module);
export default module;
