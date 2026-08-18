import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, onAddHand, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT17-028";

function lowestLevelOpponentDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const oppArea = Array.from(ctx.game.player(opponent).battleArea);
  const digimon = oppArea.filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
  if (digimon.length === 0) return [];
  const minLevel = Math.min(
    ...digimon.map((p) => ctx.game.definitionOf(p.topCard!).level ?? 99),
  );
  return digimon.filter((p) => (ctx.game.definitionOf(p.topCard!).level ?? 99) === minLevel);
}

async function returnLowestLevelOpponentDigimon(
  ctx: EffectContext,
  source: CardSource,
): Promise<void> {
  const candidates = lowestLevelOpponentDigimon(ctx, source);
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  if (chosen[0] === undefined) return;
  const perm = ctx.game.permanentById(chosen[0]);
  if (perm?.topCard !== undefined) {
    await ctx.fx.returnToHand([perm.topCard.instanceId]);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Return 1 of your opponent's Digimon with the lowest level to hand.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-return-lowest-level`,
          description:
            "[On Play] Return 1 of your opponent's Digimon with the lowest level to their hand.",
          optional: false,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            lowestLevelOpponentDigimon(ctx, source).length >= 1,
          resolve: (ctx) => returnLowestLevelOpponentDigimon(ctx, source),
        }),
      ];
    }

    // [When Digivolving] Return 1 of your opponent's Digimon with the lowest level to hand.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-return-lowest-level`,
          description:
            "[When Digivolving] Return 1 of your opponent's Digimon with the lowest level " +
            "to their hand.",
          optional: false,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            lowestLevelOpponentDigimon(ctx, source).length >= 1,
          resolve: (ctx) => returnLowestLevelOpponentDigimon(ctx, source),
        }),
      ];
    }

    // [Your Turn][Once Per Turn] When an effect adds cards to your or your opponent's hand,
    // your opponent adds the top card of their security stack to their hand.
    // KB Q2774: digivolution bonus does NOT activate this.
    // KB Q2775: same-timing double add → only 1 security card added (maxPerTurn: 1 handles this).
    if (timing === EffectTiming.OnAddHand) {
      return [
        onAddHand({
          source,
          effectKey: `${cardId}/your-turn-opponent-security-to-hand`,
          description:
            "[Your Turn][Once Per Turn] When an effect adds cards to your or your opponent's " +
            "hand, your opponent adds the top card of their security stack to their hand.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            const addedSeat = ctx.trigger.effectAddedToHandSeat;
            if (addedSeat === undefined) return false;
            return (
              addedSeat === source.ownerSeat ||
              addedSeat === ctx.game.opponentOf(source.ownerSeat)
            );
          },
          canActivate: (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return ctx.game.player(opponent).security.length >= 1;
          },
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(oppSeat);
            if (oppPlayer.security.length < 1) return;
            const topCard = oppPlayer.security[0];
            if (topCard === undefined) return;
            // Move security card to opponent's hand (silent: no security effect).
            await ctx.fx.returnToHand([topCard.instanceId], { silent: true });
          },
        }),
      ];
    }

    // [On Deletion] May return 1 Tamer + 1 [Hybrid] Digimon from trash to hand.
    // Then, may play 1 Tamer from hand without cost.
    // KB Q2776: may play the Tamer even without returning any card from trash.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-return-tamer-hybrid-play-tamer`,
          description:
            "[On Deletion] You may return 1 Tamer card and 1 [Hybrid] trait Digimon card " +
            "from your trash to the hand. Then, you may play 1 Tamer card from your hand " +
            "without paying the cost.",
          optional: true,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const hasTamer = owner.trash.some((c) => {
              const def = ctx.game.definitionOf(c);
              return (def.kinds as string[]).includes("Tamer");
            });
            const hasHybrid = owner.trash.some((c) => {
              const def = ctx.game.definitionOf(c);
              return (
                (def.kinds as string[]).includes("Digimon") &&
                (def.types ?? []).includes("Hybrid")
              );
            });
            const hasTamerInHand = owner.hand.some((c) => {
              const def = ctx.game.definitionOf(c);
              return (def.kinds as string[]).includes("Tamer");
            });
            return hasTamer || hasHybrid || hasTamerInHand;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            // Step 1: optionally return 1 Tamer from trash to hand.
            const trashTamers = owner.trash.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return (def.kinds as string[]).includes("Tamer");
            });
            if (trashTamers.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: trashTamers.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.returnToHand(chosen);
              }
            }

            // Step 2: optionally return 1 [Hybrid] Digimon from trash to hand.
            const trashHybrid = owner.trash.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return (
                (def.kinds as string[]).includes("Digimon") &&
                (def.types ?? []).includes("Hybrid")
              );
            });
            if (trashHybrid.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: trashHybrid.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.returnToHand(chosen);
              }
            }

            // Step 3: optionally play 1 Tamer from hand without cost (KB Q2776: not gated).
            const handTamers = owner.hand.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return (def.kinds as string[]).includes("Tamer");
            });
            if (handTamers.length > 0) {
              const wantToPlay = await ctx.ask.optional(
                ctx,
                "Play 1 Tamer card from your hand without paying the cost?",
              );
              if (wantToPlay) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: handTamers.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await ctx.fx.playInstances(chosen, { payCost: false });
                }
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
