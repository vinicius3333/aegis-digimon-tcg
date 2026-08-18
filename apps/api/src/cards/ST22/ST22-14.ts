import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { requireOpponentAsk } from "../../engine/decisions/decisionApi.js";

const cardId = "ST22-14";

function hasFallenAngelOrCS(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Fallen Angel" || t === "CS");
}

function hasFallenAngel(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Fallen Angel");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/cost-reduction`,
          description:
            "If your opponent has 10 or more cards in their hand or trash, reduce this card's " +
            "play cost by 5.",
          when: (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return true;
          },
          resolve: async () => {},
        }),
      ];
    }

    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] Your opponent trashes cards in their hand until they have 6. Then, you may " +
            "play 1 [Fallen Angel] trait Digimon card with a level of 5 or less from your trash " +
            "without paying the cost.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            if (opp.hand.length > 6) {
              // ENGINE-GAP: handSizeReduction primitive not available;
              // opponent should be prompted to trash down to 6 cards.
            }
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && hasFallenAngel(def) && (def.level ?? 99) <= 5;
            });
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Your opponent trashes cards in their hand until they have 6. " +
            "Then, you may play 1 [Fallen Angel] trait Digimon card with a level of 5 or less " +
            "from your trash without paying the cost.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            if (opp.hand.length > 6) {
              // ENGINE-GAP: handSizeReduction primitive not available;
              // opponent should be prompted to trash down to 6 cards.
            }
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && hasFallenAngel(def) && (def.level ?? 99) <= 5;
            });
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn`,
          description:
            "[End of Your Turn] [Once Per Turn] If your opponent has 6 or more cards in their " +
            "hand, they trash 1. Otherwise, delete their lowest level Digimon.",
          when: (ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          optional: false,
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            if (opp.hand.length >= 6) {
              // "they trash 1 of them" — the opponent picks their own hand card.
              const chosen = await requireOpponentAsk(ctx).selectCards(ctx, {
                candidates: Array.from(opp.hand).map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                ctx.fx.trash(chosen);
              }
            } else {
              const digimon = Array.from(opp.battleArea)
                .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
              let lowest: string | undefined;
              let lowestLv = 99;
              for (const p of digimon) {
                const lv = ctx.game.definitionOf(p.topCard!).level ?? 99;
                if (lv < lowestLv) {
                  lowestLv = lv;
                  lowest = p.permanentId;
                }
              }
              if (lowest !== undefined) {
                await ctx.fx.deletePermanent([lowest], "byEffect");
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
