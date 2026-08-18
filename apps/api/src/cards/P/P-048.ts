import { EffectTiming } from "@aegis/shared";
import type { CardInstance, CardKind } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// P-048 UlforceVeedramon Zero — hand-written EffectModule.
//
//
//   EffectTiming.OnEnterFieldAnyone ([When Digivolving]):
//     Cost: select 3 non-DigiEgg from trash, place at deck bottom (canNoSelect:true so
//       the whole interaction is optional).
//     After cost paid (returned == true):
//       Unsuspend this Digimon.
//       Select and unsuspend 1 of your Tamers. (Q4168: can't decline either after paying.)
//
//   EffectTiming.None installs the [Your Turn][Once Per Turn] reaction for cards
//   returned from this player's trash to their deck.
//
// KB rulings (binding):
//   Q4166: cannot activate with fewer than 3 non-Digi-Egg cards in trash.
//   Q4167: cards being returned to the deck are public information (opponent can confirm).
//   Q4168: once cost is paid (cards placed), must unsuspend both — cannot decline either.
//
const cardId = "P-048";

function nonDigiEggFromTrash(ctx: EffectContext, source: CardSource): CardInstance[] {
  return Array.from(ctx.game.player(source.ownerSeat).trash).filter((card) => {
    const def = ctx.game.definitionOf(card);
    return !def.kinds.includes("DigiEgg" as CardKind);
  });
}

function myTamers(ctx: EffectContext, source: CardSource): string[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea)
    .filter((perm) => {
      if (perm.topCard === undefined) return false;
      const def = ctx.game.definitionOf(perm.topCard);
      return def.kinds.includes("Tamer" as CardKind);
    })
    .map((perm) => perm.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/return-from-trash-memory`,
          description:
            "[Your Turn][Once Per Turn] When a card is returned from your trash to your " +
            "deck, gain 1 memory.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenCardReturnsFromTrashToDeck",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/return-from-trash-memory`,
              description:
                "[Your Turn][Once Per Turn] When a card returns from your trash to deck, gain 1 memory.",
              matches: (subCtx) =>
                subCtx.game.state.turnSeat === source.ownerSeat &&
                subCtx.trigger.returnedFromTrashToDeckSeat === source.ownerSeat,
              run: async (subCtx) => {
                subCtx.fx.gainMemory(1);
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-unsuspend`,
          description:
            "[When Digivolving] You may place 3 non-Digi-Egg cards from your trash at the " +
            "bottom of your deck in any order to unsuspend this Digimon and 1 of your Tamers.",
          optional: false,
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            // Q4166: cannot activate with fewer than 3 non-Digi-Egg cards in trash.
            return nonDigiEggFromTrash(ctx, source).length >= 3;
          },
          resolve: async (ctx) => {
            const candidates = nonDigiEggFromTrash(ctx, source);
            if (candidates.length < 3) return;

            // Optional: player may decline the cost (but Q4168: once paid, must do both).
            const willPay = await ctx.ask.optional(
              ctx,
              "Place 3 non-Digi-Egg cards from your trash at the bottom of your deck to unsuspend this Digimon and 1 Tamer?",
            );
            if (!willPay) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 3,
              max: 3,
            });
            if (chosen.length < 3) return;

            // Cost paid: place chosen cards at deck bottom.
            await ctx.fx.returnToDeck(chosen);

            // Q4168: after paying, must unsuspend both — no further optional gate.
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.unsuspend([self.permanentId]);
            }

            const tamerTargets = myTamers(ctx, source);
            if (tamerTargets.length > 0) {
              const targets = await ctx.ask.chooseTargets(ctx, {
                candidates: tamerTargets,
                min: 1,
                max: 1,
              });
              if (targets.length > 0) {
                ctx.fx.unsuspend(targets);
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
