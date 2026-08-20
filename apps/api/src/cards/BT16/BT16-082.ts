import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT16-082";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];

    return [
      staticModifier({
        source,
        effectKey: `${cardId}/move-from-breeding-search`,
        description:
          "[Your Turn][Once Per Turn] When one of your Digimon moves from breeding to the battle area, " +
          "reveal 3 cards, add 1 Digimon or Tamer, bottom the rest, then you may hatch.",
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenMovedFromBreeding",
            sourcePermanentId: self.permanentId,
            once: false,
            oncePerTurnKey: `${cardId}/move-from-breeding-search`,
            description: `${cardId}: reveal three after a move from breeding`,
            matches: (subCtx) => {
              if (!source.isOwnersTurn()) return false;
              const movedId = subCtx.trigger.subjectPermanentId;
              if (movedId === undefined) return false;
              const moved = subCtx.game.permanentById(movedId);
              return moved?.controllerSeat === source.ownerSeat && moved.inBreeding !== true;
            },
            run: async (subCtx) => {
              const revealed = await subCtx.fx.reveal(source.ownerSeat, 3);
              const candidates = revealed
                .filter((card) => {
                  const kind = subCtx.game.definitionOf(card).kinds;
                  return kind.includes(CardKind.Digimon) || kind.includes(CardKind.Tamer);
                })
                .map((card) => card.instanceId);
              const chosen = await subCtx.ask.selectCards(subCtx, {
                candidates,
                min: 0,
                max: 1,
                visible: revealed.map((card) => card.instanceId),
                visibleCards: revealed.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
              });
              if (chosen.length > 0) await subCtx.fx.returnToHand(chosen);
              const rest = revealed.filter((card) => !chosen.includes(card.instanceId)).map((card) => card.instanceId);
              if (rest.length > 0) await subCtx.fx.returnToDeck(rest, { toTop: false });
              await subCtx.ask.optional(subCtx, "Hatch 1 Digi-Egg in your breeding area?").then((accepted) => {
                if (accepted) subCtx.fx.hatch(source.ownerSeat);
              });
            },
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
