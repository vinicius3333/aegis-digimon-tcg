import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT22-006 — Moonmon (Purple Lv.2 Digi-Egg).
 *
 *
 * [Your Turn][Once Per Turn] When effects place this Digimon's top stacked card
 * as its bottom digivolution card, <Draw 1> and trash 1 card in your hand.
 */
const cardId = "BT22-006";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn][Once Per Turn] When effects place this Digimon's top stacked card
    // as its bottom digivolution card, Draw 1 and trash 1 card in your hand.
    //
    // SubTrigger, filtered to self-only additions and owner's turn.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/on-add-divo-draw-trash`,
          description:
            "[Your Turn][Once Per Turn] When effects place this Digimon's top stacked card " +
            "as its bottom digivolution card, ＜Draw 1＞ and trash 1 card in your hand.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/on-add-divo-draw-trash`,
              description: `${cardId}: When a card is placed under this Digimon, draw 1 and trash 1.`,
              matches: (subCtx) => {
                return (
                  subCtx.source.isOnBattleArea() &&
                  subCtx.source.isOwnersTurn() &&
                  subCtx.trigger.addedDigivolutionCardsPosition === "bottom"
                );
              },
              run: async (subCtx) => {
                await subCtx.fx.draw(source.ownerSeat, 1);

                const owner = subCtx.game.player(source.ownerSeat);
                if (owner.hand.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: owner.hand.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.trash(chosen);
                }
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
