import { EffectDuration, EffectTiming, digiXrosRequirementFor } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { materialsSatisfyRecipe } from "../../engine/actions/digiXros.js";

/**
 * BT10-104 — Immortal Ruler (BT10, Black Option).
 *
 *
 * Authoritative text:
 *   [Static] If you have a [Nene Amano] in play, you may use this card without meeting its
 *     color requirements.
 *   [Main] Trash 3 cards from the top of your deck. Then, you may play 1 [DarkKnightmon]
 *     from your trash for its memory cost. If you play a Digimon card with DigiXros
 *     requirements by this effect, you may also place cards from your trash in digivolution
 *     cards for a DigiXros.
 *   [Security] Add this card to its owner's hand.
 *
 *   EffectTiming.None:
 *     - rule implementation conditioned on [Nene Amano] in battle area
 *       → staticModifier calling waiveColorRequirement when condition holds.
 *   EffectTiming.OptionSkill:
 *     - IAddTrashCardsFromLibraryTop(3): reveal 3 from deck top, trash them.
 *     - rule implementation: allows DigiXros with cards from trash for this play.
 *     - Select 1 DarkKnightmon from trash to play for cost.
 *   EffectTiming.SecuritySkill:
 *     - the effect runtime.AddThisCardToHand: add the security-triggered card to hand.
 *
 */
const cardId = "BT10-104";

function hasNeneAmanoInPlay(ctx: EffectContext, ownerSeat: 0 | 1): boolean {
  return Array.from(ctx.game.player(ownerSeat).battleArea).some((p) => {
    if (p.topCard === undefined) return false;
    return ctx.game.definitionOf(p.topCard).nameEn === "Nene Amano";
  });
}

function isDarkKnightmon(def: CardDefinition): boolean {
  return def.nameEn === "DarkKnightmon";
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [Static] Waive color requirement when [Nene Amano] is in play.
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/static-nene-color-waiver`,
          description:
            "[Static] If you have a [Nene Amano] in play, you may use this card without meeting its " +
            "color requirements.",
          maxPerTurn: -1,
          when: (ctx) => hasNeneAmanoInPlay(ctx, ownerSeat),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(ctx.source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [Main] Trash 3 from deck top, optionally play DarkKnightmon from trash for cost.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-trash-deck-play-darkknightmon`,
          description:
            "[Main] Trash 3 cards from the top of your deck. Then, you may play 1 [DarkKnightmon] " +
            "from your trash for its memory cost. If you play a Digimon card with DigiXros requirements " +
            "by this effect, you may also place cards from your trash in digivolution cards for a DigiXros.",
          optional: false,
          resolve: async (ctx) => {
            // Trash 3 cards from the top of your deck.
            const ownerPlayer = ctx.game.player(ownerSeat);
            const revealed = await ctx.fx.reveal(ownerSeat, 3);
            if (revealed.length > 0) {
              const ids = revealed.map((c) => c.instanceId);
              await ctx.fx.trash(ids, { byEffectSeat: ownerSeat });
              await ctx.fx.fireOnDiscardLibrary(ownerSeat, ids);
              for (const card of revealed) {
                await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId);
              }
            }

            // Optionally play 1 DarkKnightmon from trash for its memory cost.
            const trashCandidates = Array.from(ownerPlayer.trash)
              .filter((c) => isDarkKnightmon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (trashCandidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: trashCandidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            const chosenCard = ownerPlayer.trash.find((card) => card.instanceId === chosen[0]);
            const requirement = chosenCard === undefined ? undefined : digiXrosRequirementFor(chosenCard.cardId)?.[0];
            let digiXrosMaterialInstanceIds: string[] = [];
            if (requirement !== undefined) {
              const materialCandidates = Array.from(ownerPlayer.trash)
                .filter((card) => card.instanceId !== chosen[0])
                .filter((card) =>
                  requirement.materials.some((slot) =>
                    materialsSatisfyRecipe([ctx.game.definitionOf(card)], [slot]),
                  ),
                )
                .map((card) => card.instanceId);
              const selected = await ctx.ask.selectCards(ctx, {
                candidates: materialCandidates,
                min: 0,
                max: requirement.materials.length === 1
                  ? materialCandidates.length
                  : requirement.materials.length,
              });
              const selectedDefinitions = selected.map((id) =>
                ctx.game.definitionOf(ownerPlayer.trash.find((card) => card.instanceId === id)!),
              );
              if (materialsSatisfyRecipe(selectedDefinitions, requirement.materials)) {
                digiXrosMaterialInstanceIds = selected;
              }
            }

            await ctx.fx.playInstances(chosen, {
              payCost: true,
              digiXrosMaterialInstanceIds,
            });
          },
        }),
      ];
    }

    // [Security] Add this card to its owner's hand.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-add-to-hand`,
          description: "[Security] Add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            // Add the security card (this instance) back to hand.
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
