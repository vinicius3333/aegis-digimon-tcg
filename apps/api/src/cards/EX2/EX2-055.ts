import { EffectDuration, EffectTiming, getCompiledCard, type Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { GameAccess } from "../../engine/effects/EffectContext.js";
import { whenAttacking, beforePayCost, staticModifier } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "EX2-055";

/**
 * EX2-055 — EX2 White Digimon.
 *
 * 1. BeforePayCost: trash 7+ digivolution cards from BOTTOM of 1 [Mother D-Reaper]
 * 2. [When Attacking]: place 2 [ADR-02 Searcher] from trash under this Digimon as
 * 3. Static: Rush (documented behavior).
 */

function motherDReaperWith7PlusStack(game: GameAccess, ownerSeat: Seat): string[] {
  const player = game.player(ownerSeat);
  return player.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const name = game.definitionOf(p.topCard).nameEn;
      if (!name.includes("Mother D-Reaper") && !name.includes("MotherD-Reaper")) return false;
      return p.stack.length >= 7;
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // BeforePayCost: trash 7+ from bottom of Mother D-Reaper -> set cost to 0
    if (timing === EffectTiming.BeforePayCost) {
      return [
        beforePayCost({
          source,
          effectKey: `${cardId}/before-pay-cost-trash-7-plus-set-cost-0`,
          description:
            "When you would play this Digimon, you may trash 7 or more digivolution cards " +
            "from the bottom of 1 of your [Mother D-Reaper]s to set this Digimon's play cost to 0.",
          when: (ctx) => {
            // The card being played is this card itself
            return ctx.source.cardId === cardId;
          },
          canActivate: (ctx) => {
            return motherDReaperWith7PlusStack(ctx.game, ctx.source.ownerSeat).some((motherId) => {
              const mother = ctx.game.permanentById(motherId);
              if (mother === undefined) return false;
              return mother.stack.filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) ?? true).length >= 7;
            });
          },
          resolve: async (ctx) => {
            const motherIds = motherDReaperWith7PlusStack(ctx.game, ctx.source.ownerSeat).filter((motherId) => {
              const mother = ctx.game.permanentById(motherId);
              return (
                mother !== undefined &&
                mother.stack.filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) ?? true).length >= 7
              );
            });
            if (motherIds.length === 0) return;

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Trash 7+ digivolution cards from bottom of [Mother D-Reaper] to set play cost to 0?",
            );
            if (!wantToPay) return;

            const chosenMother = await ctx.ask.chooseTargets(ctx, {
              candidates: motherIds,
              min: 1,
              max: 1,
            });
            if (chosenMother.length === 0) return;

            const motherPerm = ctx.game.permanentById(chosenMother[0]!);
            if (motherPerm === undefined || motherPerm.stack.length < 7) return;

            // The printed cost is 7 OR MORE, so expose every legal contiguous amount to
            // the decision protocol instead of silently fixing the payment at 7.
            const legalCounts = Array.from({ length: motherPerm.stack.length - 6 }, (_, index) => index + 7).filter(
              (count) =>
                motherPerm.stack
                  .slice(0, count)
                  .filter((card) => ctx.fx.canTrashDigivolutionCard?.(card.instanceId) ?? true).length >= 7,
            );
            if (legalCounts.length === 0) return;
            const countChoice =
              legalCounts.length === 1
                ? 0
                : await ctx.ask.chooseOption(
                    ctx,
                    legalCounts.map((count) => `Trash ${count} digivolution cards`),
                  );
            const trashCount = legalCounts[countChoice] ?? 7;
            const toTrash: string[] = [];
            for (let i = 0; i < trashCount; i++) {
              if (motherPerm.stack[i] !== undefined) {
                toTrash.push(motherPerm.stack[i]!.instanceId);
              }
            }

            if (toTrash.length < 7) return;

            const trashed = await ctx.fx.trashDigivolutionCards(chosenMother[0]!, toTrash, {
              byEffectSeat: ctx.source.ownerSeat,
            });
            if (trashed.length < 7) return;

            // Set play cost to 0. The consumer
            // (GameEngine.fireBeforePayCost) floors the delta at 0 and computes cost = max(0,
            // baseCost - delta), so "set to 0" is a full-cost POSITIVE reduction — a negative
            // delta is clamped to 0 (no reduction). Accumulate onto any prior delta.
            ctx.playCostDelta = (ctx.playCostDelta ?? 0) + (ctx.source.definition.playCost ?? 0);
          },
        }),
      ];
    }

    // [When Attacking]: place 2 [ADR-02 Searcher] from trash -> if 2 placed, unsuspend
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-place-searcher-unsuspend`,
          description:
            "[When Attacking] You may place 2 [ADR-02 Searcher]s from your trash " +
            "under this Digimon in any order as its bottom digivolution cards to unsuspend this Digimon.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            const searcherCount = owner.trash.filter((c) => {
              const name = ctx.game.definitionOf(c).nameEn;
              return name.includes("ADR-02 Searcher") || name.includes("ADR-02Searcher");
            }).length;
            return searcherCount >= 2;
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const owner = ctx.game.player(ctx.source.ownerSeat);
            const searcherIds = owner.trash
              .filter((c) => {
                const name = ctx.game.definitionOf(c).nameEn;
                return name.includes("ADR-02 Searcher") || name.includes("ADR-02Searcher");
              })
              .map((c) => c.instanceId);

            if (searcherIds.length < 2) return;

            let chosenIds: string[] = [];
            if (searcherIds.length === 2) {
              chosenIds = searcherIds;
            } else {
              chosenIds = await ctx.ask.selectCards(ctx, {
                candidates: searcherIds,
                min: 2,
                max: 2,
                visibleCards: owner.trash
                  .filter((card) => searcherIds.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
              });
            }

            if (chosenIds.length === 0) return;
            if (chosenIds.length > 1 && ctx.ask.orderCards !== undefined) {
              chosenIds = await ctx.ask.orderCards(ctx, {
                candidates: chosenIds,
                visibleCards: owner.trash
                  .filter((card) => chosenIds.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                destination: "stackBottom",
              });
            }

            // Place as bottom digivolution cards
            await ctx.fx.placeUnder(selfPerm.permanentId, [...chosenIds].reverse(), { belowTop: false });

            // If 2 were placed, unsuspend
            if (chosenIds.length >= 2) {
              ctx.fx.unsuspend([selfPerm.permanentId]);
            }
          },
        }),
      ];
    }

    // Static: Rush
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/static-rush`,
          description: "＜Rush＞.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm !== undefined) {
              ctx.fx.grantKeyword(selfPerm.permanentId, "Rush", EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerIrCard(cardId, getCompiledCard(cardId)!);
export default module;
