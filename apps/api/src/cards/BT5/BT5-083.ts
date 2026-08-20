import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onDeletion, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT5-083";

function isGallantmonLevel6(def: CardDefinition): boolean {
  return (
    isDigimon(def) &&
    def.level === 6 &&
    def.nameEn.toLowerCase().includes("gallantmon")
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Both players trash the top 5 cards of their decks.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-top-5`,
          description:
            "[When Digivolving] Both players trash the top 5 cards of their decks.",
          optional: false,
          canActivate: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const seats = [source.ownerSeat, ctx.game.opponentOf(source.ownerSeat)];
            for (const seat of seats) {
              const deck = ctx.game.player(seat).deck;
              if (deck.length === 0) continue;
              const revealCount = Math.min(5, deck.length);
              const revealed = await ctx.fx.reveal(seat, revealCount);
              if (revealed.length === 0) continue;
              const ids = revealed.map((c) => c.instanceId);
              await ctx.fx.trash(ids);
              await ctx.fx.fireOnDiscardLibrary(seat, ids);
              for (const c of revealed) {
                await ctx.fx.fireWhenTrashedFromDeck(c.cardId, c.instanceId);
              }
            }
          },
        }),
      ];
    }

    // [On Deletion] If you have a Tamer in play, you may play 1 level 6 Digimon card
    // with [Gallantmon] in its name from your hand or trash without paying its
    // memory cost.
    //
    //     + eligible card in hand or trash.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-gallantmon`,
          description:
            "[On Deletion] If you have a Tamer in play, you may play 1 level 6 " +
            "Digimon card with [Gallantmon] in its name from your hand or trash " +
            "without paying its memory cost.",
          optional: true,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const hasTamer = owner.battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              return ctx.game.definitionOf(p.topCard).kinds.includes("Tamer" as never);
            });
            if (!hasTamer) return false;
            const handEligible = owner.hand.some((c) =>
              isGallantmonLevel6(ctx.game.definitionOf(c)),
            );
            const trashEligible = Array.from(owner.trash).some((c) =>
              isGallantmonLevel6(ctx.game.definitionOf(c)),
            );
            return handEligible || trashEligible;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const handCandidates = owner.hand.filter((c) =>
              isGallantmonLevel6(ctx.game.definitionOf(c)),
            );
            const trashCandidates = Array.from(owner.trash).filter((c) =>
              isGallantmonLevel6(ctx.game.definitionOf(c)),
            );

            const canHand = handCandidates.length > 0;
            const canTrash = trashCandidates.length > 0;

            if (!canHand && !canTrash) return;

            let fromHand: boolean;
            if (canHand && canTrash) {
              fromHand = await ctx.ask.optional(ctx, "Play from hand?");
            } else {
              fromHand = canHand;
            }

            const pool = fromHand ? handCandidates : trashCandidates;
            if (pool.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: pool.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
