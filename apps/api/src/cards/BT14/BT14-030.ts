import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT14-030 — MarineAngemon (BT14, Blue Lv.6 Digimon).
 *
 * Authoritative text:
 *   [On Play][When Digivolving] By returning 1 of your opponent's level 3 Digimon
 *     or 1 of your Digimon to the hand, return 1 of your opponent's Digimon whose
 *     level is less than or equal to the returned Digimon's level to the hand.
 *   [Your Turn][Once Per Turn] When another Digimon returns to the hand,
 *     ＜Recovery +1 (Deck)＞.
 *
 * KB rulings (binding):
 *   Q2400: The cost can return ANY level of your own Digimon; the "level 3" only
 *          restricts the opponent's Digimon option.
 *   Q2401: You can activate even if your opponent has no Digimon (returning your own).
 *   Q2402/Q2404: Tokens/Mother D-Reaper that cannot actually go to hand still satisfy
 *                the cost condition.
 *
 */
const cardId = "BT14-030";

function oppLv3DigimonInstanceIds(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  const oppSeat = ctx.game.opponentOf(ownerSeat);
  return ctx.game.player(oppSeat).battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && def.level === 3;
    })
    .map((p) => p.topCard!.instanceId);
}

function myDigimonInstanceIds(ctx: EffectContext, ownerSeat: 0 | 1): string[] {
  return ctx.game.player(ownerSeat).battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.topCard!.instanceId);
}

function oppDigimonAtMostLevelInstanceIds(
  ctx: EffectContext,
  ownerSeat: 0 | 1,
  maxLevel: number | undefined,
): string[] {
  const oppSeat = ctx.game.opponentOf(ownerSeat);
  return ctx.game.player(oppSeat).battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      if (!isDigimon(def)) return false;
      if (maxLevel === undefined) return false;
      return def.level !== undefined && def.level <= maxLevel;
    })
    .map((p) => p.topCard!.instanceId);
}

async function resolveReturnEffect(ctx: EffectContext, ownerSeat: 0 | 1): Promise<void> {
  const costCandidates = [
    ...oppLv3DigimonInstanceIds(ctx, ownerSeat),
    ...myDigimonInstanceIds(ctx, ownerSeat),
  ];
  if (costCandidates.length === 0) return;

  const willPay = await ctx.ask.optional(
    ctx,
    "Return 1 of your opponent's Lv.3 Digimon or 1 of your Digimon to hand as cost?",
  );
  if (!willPay) return;

  const costPicks = await ctx.ask.selectCards(ctx, { candidates: costCandidates, min: 1, max: 1 });
  if (costPicks.length === 0) return;
  const costInstanceId = costPicks[0]!;

  // Determine the level of the cost Digimon before returning it.
  let returnedLevel: number | undefined;
  const allAreas = [
    ...ctx.game.player(ownerSeat).battleArea,
    ...ctx.game.player(ctx.game.opponentOf(ownerSeat)).battleArea,
  ];
  for (const p of allAreas) {
    if (p.topCard?.instanceId === costInstanceId) {
      returnedLevel = ctx.game.definitionOf(p.topCard).level;
      break;
    }
  }

  await ctx.fx.returnToHand([costInstanceId]);

  const effectTargets = oppDigimonAtMostLevelInstanceIds(ctx, ownerSeat, returnedLevel);
  if (effectTargets.length === 0) return;

  const effectPicks = await ctx.ask.chooseTargets(ctx, { candidates: effectTargets, min: 1, max: 1 });
  if (effectPicks.length === 0) return;
  await ctx.fx.returnToHand([effectPicks[0]!]);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-return-bounce`,
          description:
            "[On Play] By returning 1 of your opponent's Lv.3 Digimon or your own Digimon to " +
            "hand, return 1 of your opponent's Digimon of equal or lower level to hand.",
          optional: true,
          resolve: async (ctx) => {
            await resolveReturnEffect(ctx, source.ownerSeat);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-return-bounce`,
          description:
            "[When Digivolving] By returning 1 of your opponent's Lv.3 Digimon or your own " +
            "Digimon to hand, return 1 of your opponent's Digimon of equal or lower level to hand.",
          optional: true,
          resolve: async (ctx) => {
            await resolveReturnEffect(ctx, source.ownerSeat);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/return-digimon-recovery`,
          description: "[Your Turn][Once Per Turn] When another Digimon returns to the hand, ＜Recovery +1＞.",
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn() && ctx.game.state.turnSeat === source.ownerSeat,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenDigimonReturnsToHand",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/return-digimon-recovery`,
              matches: (subCtx) => subCtx.trigger.returnedDigimonToHandSeat === source.ownerSeat,
              run: async (subCtx) => {
                await subCtx.fx.recoverToSecurity(source.ownerSeat, 1);
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
