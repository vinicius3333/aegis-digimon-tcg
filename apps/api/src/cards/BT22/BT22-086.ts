import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT22-086 — Blue Tamer (BT22, Yao Qinglan).
//
// [Start of Your Main Phase] By returning this Tamer to the bottom of the deck, you may
//   play 1 [Yao Qinglan] from your hand without paying the cost. Then, if you don't have a
//   Digimon, you may play 1 [Sangomon] from your trash without paying the cost.
// [All Turns] When effects add digivolution cards to any of your Digimon with [Aqua] or
//   [Sea Animal] in any of their traits, by suspending this Tamer, <Draw 1>.
// [Security] Play this card without paying the cost.
//
// KB Q4956: "then" (Sangomon) cannot process without meeting "by" (return). The cost
//   gates the entire sequence.

const cardId = "BT22-086";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase`,
          description:
            "[Start of Your Main Phase] By returning this Tamer to the bottom of the deck, " +
            "you may play 1 [Yao Qinglan] from your hand without paying the cost. Then, if " +
            "you don't have a Digimon, you may play 1 [Sangomon] from your trash without " +
            "paying the cost.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (perm === undefined || perm.topCard === undefined) return;

            // Return this Tamer to the bottom of the deck (cost)
            await ctx.fx.returnToDeck([perm.topCard.instanceId], { toTop: false });

            // The card is now no longer on the field. Check if it left.
            if (source.isOnBattleArea()) return;

            const owner = ctx.game.player(source.ownerSeat);

            // Play 1 Yao Qinglan from hand
            const yaoCards = Array.from(owner.hand).filter((card) =>
              ctx.game.definitionOf(card).nameEn === "Yao Qinglan",
            );

            if (yaoCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: yaoCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }

            // Then, if no Digimon, play Sangomon from trash
            const hasDigimon = Array.from(owner.battleArea).some((p) => {
              if (p.topCard == null) return false;
              return isDigimon(ctx.game.definitionOf(p.topCard));
            });

            if (!hasDigimon) {
              const sangoCards = Array.from(owner.trash).filter((card) =>
                ctx.game.definitionOf(card).nameEn === "Sangomon",
              );

              if (sangoCards.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: sangoCards.map((c) => c.instanceId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await ctx.fx.playInstances(chosen, { payCost: false });
                }
              }
            }
          },
        }),
      ];
    }

    // BLOCKED: All Turns sub-trigger on onAddDigivolutionCards is not yet supported.
    //   1. when effects add digivolution cards to your Aqua/Sea Animal Digimon
    //   2. by suspending this Tamer, Draw 1
    // Requires the OnAddDigivolutionCards timing and sub-trigger support.

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
