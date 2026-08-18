import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX3-035 — Goldramon (EX3, Yellow Lv.6 Digimon).
 *
 * [When Digivolving] You may return 1 [Four Great Dragons] trait card from trash to hand.
 * [When Attacking] 1 opponent Digimon -6000 DP for the turn. Then, by returning
 *   1 [Magnadramon] + 1 [Azulongmon] + 1 [Megidramon] from trash to deck bottom,
 *   trash top 2 of opponent's security.
 */
const cardId = "EX3-035";

function hasFourGreatDragons(def: ReturnType<EffectContext["game"]["definitionOf"]>): boolean {
  const traits = def.types ?? [];
  return traits.includes("Four Great Dragons") || traits.includes("FourGreatDragons");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-return`,
          description:
            "[When Digivolving] You may return 1 card with the [Four Great Dragons] trait from your trash to your hand.",
          optional: true,
          canActivate: (ctx) => {
            const trash = ctx.game.player(source.ownerSeat).trash;
            return trash.some((c) => hasFourGreatDragons(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const trash = ctx.game.player(source.ownerSeat).trash;
            const candidates = trash
              .filter((c) => hasFourGreatDragons(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 1,
              max: 1,
              visible: trash.map((card) => card.instanceId),
              visibleCards: trash.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            });
            if (chosen.length > 0) {
              await ctx.fx.returnToHand(chosen);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking`,
          description:
            "[When Attacking] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, by returning 1 [Magnadramon], 1 [Azulongmon], and 1 [Megidramon] from your trash to the bottom of your deck in any order, trash the top 2 cards of your opponent's security stack.",
          optional: false,
          resolve: async (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const oppIds = opp.battleArea
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);

            if (oppIds.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: oppIds,
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                ctx.fx.modifyDP(chosen[0]!, -6000, EffectDuration.UntilEachTurnEnd);
              }
            }

            const trash = ctx.game.player(source.ownerSeat).trash;
            const hasMagna = trash.some((c) => ctx.game.definitionOf(c).nameEn === "Magnadramon");
            const hasAzul = trash.some((c) => ctx.game.definitionOf(c).nameEn === "Azulongmon");
            const hasMegi = trash.some((c) => ctx.game.definitionOf(c).nameEn === "Megidramon");

            if (hasMagna && hasAzul && hasMegi) {
              const visible = trash.map((card) => card.instanceId);
              const visibleCards = trash.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId }));
              const candidatesForName = (name: string) =>
                trash.filter((c) => ctx.game.definitionOf(c).nameEn === name).map((c) => c.instanceId);
              const magnadramon = await ctx.ask.selectCards(ctx, {
                candidates: candidatesForName("Magnadramon"),
                min: 0,
                max: 1,
                visible,
                visibleCards,
              });
              if (magnadramon.length === 0) return;
              const azulongmon = await ctx.ask.selectCards(ctx, {
                candidates: candidatesForName("Azulongmon"),
                min: 1,
                max: 1,
                visible,
                visibleCards,
              });
              const megidramon = await ctx.ask.selectCards(ctx, {
                candidates: candidatesForName("Megidramon"),
                min: 1,
                max: 1,
                visible,
                visibleCards,
              });
              if (azulongmon.length !== 1 || megidramon.length !== 1) return;
              const chosen = [...magnadramon, ...azulongmon, ...megidramon];
              const ordered =
                ctx.ask.orderCards === undefined
                  ? chosen
                  : await ctx.ask.orderCards(ctx, { candidates: chosen, destination: "deckBottom" });
              await ctx.fx.returnToDeck(ordered, { toTop: false });
              await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 2, { fromTop: true });
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
