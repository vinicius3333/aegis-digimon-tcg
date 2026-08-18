import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking, onDeletion, beforePayCost, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT17-048";

function argomonTrashCount(ctx: EffectContext, source: CardSource): number {
  return ctx.game.player(source.ownerSeat).trash.filter(
    (c) => ctx.game.definitionOf(c).nameEn === "Argomon",
  ).length;
}

function hasLevel6Argomon(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).hand.some((c) => {
    const def = ctx.game.definitionOf(c);
    return def.nameEn === "Argomon" && isDigimon(def) && def.level === 6;
  });
}

function unsuspendedTamers(ctx: EffectContext, source: CardSource) {
  const bothSeats = [source.ownerSeat, ctx.game.opponentOf(source.ownerSeat)];
  const result = [];
  for (const seat of bothSeats) {
    for (const p of ctx.game.player(seat).battleArea) {
      if (p.topCard === undefined || p.isSuspended) continue;
      const def = ctx.game.definitionOf(p.topCard);
      if ((def.kinds as string[]).includes("Tamer")) {
        result.push(p);
      }
    }
  }
  return result;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Opponent's Turn] Opponent's Tamers cannot unsuspend.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opponents-turn-tamers-cant-unsuspend`,
          description:
            "[Opponent's Turn] None of your opponent's Tamers can unsuspend.",
          when: (ctx) => ctx.source.isOnBattleArea() && !ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            if (!ctx.source.isOnBattleArea() || ctx.source.isOwnersTurn()) return;
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            for (const p of ctx.game.player(oppSeat).battleArea) {
              if (p.topCard === undefined) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (!(def.kinds as string[]).includes("Tamer")) continue;
              ctx.fx.restrict(p.permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    // BeforePayCost: suspend up to 5 Tamers (any player) → -1 digivolution cost per Tamer.
    // canEndNotMax: true → player may suspend fewer than 5.
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-suspend-tamers`,
          description:
            "When digivolving into this card, by suspending up to 5 Tamers, " +
            "reduce the digivolution cost by 1 for each Tamer suspended.",
          canActivate: (ctx) => unsuspendedTamers(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const eligibles = unsuspendedTamers(ctx, source);
            if (eligibles.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: eligibles.map((p) => p.permanentId),
              min: 0,
              max: Math.min(5, eligibles.length),
            });
            if (chosen.length === 0) return;

            await ctx.fx.suspend(chosen);
            ctx.playCostDelta = (ctx.playCostDelta ?? 0) + chosen.length;
          },
        }),
      ];
    }

    // [On Deletion] If 4+ [Argomon] in trash, may play 1 Lv.6 [Argomon] from hand for free.
    // KB Q2800: checked AFTER this card moves to trash (so this card itself counts).
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-level6-argomon`,
          description:
            "[On Deletion] If you have 4 or more [Argomon] in the trash, you may play " +
            "1 level 6 [Argomon] from your hand without paying the cost.",
          optional: true,
          canActivate: (ctx) =>
            argomonTrashCount(ctx, source) >= 4 && hasLevel6Argomon(ctx, source),
          resolve: async (ctx) => {
            if (argomonTrashCount(ctx, source) < 4) return;
            const candidates = ctx.game.player(source.ownerSeat).hand
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return def.nameEn === "Argomon" && isDigimon(def) && def.level === 6;
              })
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const wantToPlay = await ctx.ask.optional(
              ctx,
              "Play 1 level 6 [Argomon] from your hand without paying the cost?",
            );
            if (!wantToPlay) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
            }
          },
        }),
      ];
    }

    // [When Attacking][Inherited][Once Per Turn] By suspending 1 of your [Rhythm] Tamers,
    // unsuspend this Digimon.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-when-attacking-rhythm-unsuspend`,
          description:
            "[When Attacking][Inherited][Once Per Turn] By suspending 1 of your [Rhythm] " +
            "Tamers, unsuspend this Digimon.",
          optional: true,
          isInherited: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.battleArea.some((p) => {
              if (p.topCard === undefined || p.isSuspended) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (
                (def.kinds as string[]).includes("Tamer") && def.nameEn === "Rhythm"
              );
            });
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const rhythmTamers = owner.battleArea.filter((p) => {
              if (p.topCard === undefined || p.isSuspended) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (
                (def.kinds as string[]).includes("Tamer") && def.nameEn === "Rhythm"
              );
            });
            if (rhythmTamers.length === 0) return;

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Suspend 1 of your [Rhythm] Tamers to unsuspend this Digimon?",
            );
            if (!wantToPay) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: rhythmTamers.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen[0] === undefined) return;
            await ctx.fx.suspend([chosen[0]]);

            // Unsuspend this Digimon.
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.unsuspend([self.permanentId]);
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
