import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT2-094 — Arctic Blizzard (BT2, Blue Option).
 *
 *
 * Printed text:
 *   [Main] Choose 1 digivolution card of 1 of your opponent's Digimon and trash it.
 *     Then, 1 of your Digimon gets +2000 DP for the turn.
 *   [Security] Add this card to its owner's hand.
 *
 *   EffectTiming.OptionSkill ([Main]) → EffectTiming.OnUseOption:
 *     SelectTrashDigivolutionCards(permanentCondition: opponentBattleAreaDigimon,
 *       cardCondition: !CanNotTrashFromDigivolutionCards, maxCount: 1, canNoTrash: false,
 *       isFromOnly1Permanent: true) — trash 1 divo card from 1 opponent Digimon.
 *     Then select 1 own battle-area Digimon and ChangeDigimonDP(+2000, UntilEachTurnEnd).
 *   EffectTiming.SecuritySkill ([Security]) → EffectTiming.SecuritySkill:
 *     AddThisCardToHand → returnToHand([source.instanceId])
 *
 * Implementation:
 *   The "SelectTrashDigivolutionCards" flow requires two nested selections:
 *   1. Select 1 opponent battle-area Digimon that has at least 1 digivolution card.
 *   2. Select 1 of that Digimon's digivolution-stack cards.
 *   3. ctx.fx.trashDigivolutionCards(hostPermanentId, [instanceId])
 */
const cardId = "BT2-094";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] OptionSkill — trash 1 digivolution card from opponent, then own Digimon +2000 DP.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-trash-divo-dp-boost`,
          description:
            "[Main] Choose 1 digivolution card of 1 of your opponent's Digimon and trash it. " +
            "Then, 1 of your Digimon gets +2000 DP for the turn.",
          optional: false,
          canActivate: () => true,
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const opponent = ctx.game.player(opponentSeat);

            // Step 1: select 1 opponent Digimon that has digivolution cards.
            const opponentTargets = Array.from(opponent.battleArea)
              .filter(
                (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length > 0,
              )
              .map((p) => p.permanentId);

            if (opponentTargets.length > 0) {
              const chosenHost = await ctx.ask.chooseTargets(ctx, {
                candidates: opponentTargets,
                min: 1,
                max: 1,
              });
              const hostPermanentId = chosenHost[0];
              const hostPerm = hostPermanentId === undefined ? undefined : ctx.game.permanentById(hostPermanentId);
              const divoCards = hostPerm?.stack.map((c) => c.instanceId) ?? [];
              if (hostPermanentId !== undefined && divoCards.length > 0) {
                const chosenDivo = await ctx.ask.selectCards(ctx, {
                  candidates: divoCards,
                  min: 1,
                  max: 1,
                });
                if (chosenDivo[0] !== undefined) {
                  await ctx.fx.trashDigivolutionCards(hostPermanentId, [chosenDivo[0]]);
                }
              }
            }

            // Step 4: select 1 own Digimon and give +2000 DP for the turn.
            const owner = ctx.game.player(source.ownerSeat);
            const ownTargets = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);

            if (ownTargets.length === 0) return;

            const chosenOwn = await ctx.ask.chooseTargets(ctx, {
              candidates: ownTargets,
              min: 1,
              max: 1,
            });
            if (chosenOwn.length === 0) return;

            ctx.fx.modifyDP(chosenOwn[0]!, 2000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [Security] Add this card to its owner's hand.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-add-hand`,
          description: "[Security] Add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
