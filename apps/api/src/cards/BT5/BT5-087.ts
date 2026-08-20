import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT5-087";

function isBlackOrPurpleDigimonCostLe8(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  if (def.playCost > 8) return false;
  return def.colors.includes(CardColor.Black) || def.colors.includes(CardColor.Purple);
}

function isLevel6Digimon(def: CardDefinition): boolean {
  return isDigimon(def) && def.level === 6;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Trash the top 3 cards of your deck. Then, you may play
    // up to 2 black and/or purple Digimon cards with play costs of 8 or less from
    // your trash without paying their memory costs.
    //
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-3-play-from-trash`,
          description:
            "[When Digivolving] Trash the top 3 cards of your deck. Then, you may " +
            "play up to 2 black and/or purple Digimon cards with play costs of 8 or " +
            "less from your trash without paying their memory costs.",
          optional: false,
          canActivate: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;

            // Trash top 3 of your deck.
            const revealed = await ctx.fx.reveal(ownerSeat, 3);
            if (revealed.length > 0) {
              const ids = revealed.map((c) => c.instanceId);
              await ctx.fx.trash(ids);
              await ctx.fx.fireOnDiscardLibrary(ownerSeat, ids);
              for (const c of revealed) {
                await ctx.fx.fireWhenTrashedFromDeck(c.cardId, c.instanceId);
              }
            }

            // Optionally play up to 2 black/purple Digimon cost ≤8 from trash.
            const trashCandidates = Array.from(ctx.game.player(ownerSeat).trash)
              .filter((c) => isBlackOrPurpleDigimonCostLe8(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            if (trashCandidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: trashCandidates,
              min: 0,
              max: 2,
            });

            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
            }
          },
        }),
      ];
    }

    // [When Attacking] You may return 1 level 6 Digimon card in this Digimon's
    // digivolution cards to its owner's hand to delete 1 of your opponent's
    // unsuspended Digimon with a play cost of 12 or less.
    //
    //     select opponent's unsuspended Digimon cost ≤12 → delete.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-return-digi-card-delete`,
          description:
            "[When Attacking] You may return 1 level 6 Digimon card in this " +
            "Digimon's digivolution cards to its owner's hand to delete 1 of your " +
            "opponent's unsuspended Digimon with a play cost of 12 or less.",
          optional: true,
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self === undefined) return false;
            return self.stack.some((c) => isLevel6Digimon(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;

            // Select 1 Lv.6 Digimon from digivolution cards to return to hand.
            const stackCandidates = Array.from(self.stack)
              .filter((c) => isLevel6Digimon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            if (stackCandidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: stackCandidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.returnToHand(chosen);

            // Delete 1 opponent's unsuspended Digimon with play cost ≤12.
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const targetIds = opp.battleArea
              .filter((p) => {
                if (p.isSuspended) return false;
                if (p.inBreeding) return false;
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def)) return false;
                return def.playCost <= 12;
              })
              .map((p) => p.permanentId);

            if (targetIds.length === 0) return;

            const deletionTargets = await ctx.ask.chooseTargets(ctx, {
              candidates: targetIds,
              min: 1,
              max: 1,
            });
            if (deletionTargets.length === 0) return;

            await ctx.fx.deletePermanent(deletionTargets);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
