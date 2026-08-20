import { EffectTiming, type Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX2-049";

/**
 * EX2-049 — ADR-02=Searcher (EX2, White Lv.2 Digimon).
 *
 * [Main] (OnDeclaration): by suspending this Digimon, reveal top 5 cards of deck,
 * place 1 [ADR-02 Searcher] among them under 1 of your [Mother D-Reaper]s as its
 * bottom digivolution card, then place the remaining cards at the bottom of deck in any order.
 */

function hasMotherDReaper(game: EffectContext["game"], ownerSeat: Seat): boolean {
  const player = game.player(ownerSeat);
  return player.battleArea.some((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const name = game.definitionOf(p.topCard).nameEn;
    return name.includes("Mother D-Reaper") || name.includes("MotherD-Reaper");
  });
}

function eligibleMotherDReaperIds(game: EffectContext["game"], ownerSeat: Seat): string[] {
  const player = game.player(ownerSeat);
  return player.battleArea
    .filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const name = game.definitionOf(p.topCard).nameEn;
      return name.includes("Mother D-Reaper") || name.includes("MotherD-Reaper");
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-reveal-5-place-searcher`,
          description:
            "[Main] By suspending this Digimon, reveal the top 5 cards of your deck. " +
            "Place 1 [ADR-02 Searcher] among them under 1 of your [Mother D-Reaper]s " +
            "as its bottom digivolution card. Place the remaining cards at the bottom " +
            "of your deck in any order.",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.isSuspended || perm.inBreeding) return false;
            return true;
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            const revealed = await ctx.fx.reveal(ctx.source.ownerSeat, 5);
            if (revealed.length === 0) return;

            const searcherIds: string[] = [];
            for (const card of revealed) {
              const def = ctx.game.definitionOf(card);
              const name = def.nameEn;
              if (name.includes("ADR-02 Searcher") || name.includes("ADR-02Searcher")) {
                searcherIds.push(card.instanceId);
              }
            }

            if (searcherIds.length === 0) {
              await ctx.fx.returnToDeck(revealed.map((c) => c.instanceId), { toTop: false });
              return;
            }

            const chosenSearcher = await ctx.ask.selectCards(ctx, {
              candidates: searcherIds,
              min: 1,
              max: 1,
              visible: revealed.map((card) => card.instanceId),
              visibleCards: revealed.map((card) => ({
                instanceId: card.instanceId,
                cardId: card.cardId,
              })),
            });
            if (chosenSearcher.length === 0) {
              await ctx.fx.returnToDeck(revealed.map((c) => c.instanceId), { toTop: false });
              return;
            }

            const chosenId = chosenSearcher[0]!;

            let targetPermId: string | undefined;
            if (hasMotherDReaper(ctx.game, ctx.source.ownerSeat)) {
              const motherIds = eligibleMotherDReaperIds(ctx.game, ctx.source.ownerSeat);
              if (motherIds.length === 1) {
                targetPermId = motherIds[0];
              } else if (motherIds.length > 1) {
                const chosen = await ctx.ask.chooseTargets(ctx, {
                  candidates: motherIds,
                  min: 1,
                  max: 1,
                });
                targetPermId = chosen[0];
              }
            }

            if (targetPermId !== undefined) {
              ctx.fx.placeUnder(targetPermId, [chosenId], { belowTop: false });
            }

            let remaining = revealed
              .filter((c) => c.instanceId !== chosenId)
              .map((c) => c.instanceId);
            if (remaining.length > 1 && ctx.ask.orderCards !== undefined) {
              remaining = await ctx.ask.orderCards(ctx, {
                candidates: remaining,
                visibleCards: revealed
                  .filter((card) => remaining.includes(card.instanceId))
                  .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
              });
            }
            if (remaining.length > 0) {
              await ctx.fx.returnToDeck(remaining, { toTop: false });
            }

            const owner = ctx.game.player(ctx.source.ownerSeat);
            for (const card of owner.deck) card.faceUp = false;
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
