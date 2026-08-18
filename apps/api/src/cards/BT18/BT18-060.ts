import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT18-060";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) [On Play] — Reveal top 3 deck, add Vemmon-text to hand, place Vemmon as bottom digivolution card
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal-add-vemmon`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Vemmon] in its " +
            "text among them to the hand, and place 1 [Vemmon] among them as the bottom " +
            "digivolution card of 1 of your Digimon. Return the rest to the bottom of the deck.",
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const owner = ctx.game.player(ownerSeat);

            const revealed = await ctx.fx.reveal(ownerSeat, 3);
            if (revealed.length === 0) return;

            // Track which revealed cards have been claimed
            const claimed = new Set<string>();

            // --- Selection 1: Add 1 card with "Vemmon" in text to hand ---
            const textCandidates = revealed.filter(
              (c) => !claimed.has(c.instanceId) && hasVemmonText(ctx.game, c),
            );
            if (textCandidates.length > 0) {
              const textPicked = await ctx.ask.selectCards(ctx, {
                candidates: textCandidates.map((c) => c.instanceId),
                min: 1,
                max: Math.min(1, textCandidates.length),
              });
              if (textPicked.length > 0) {
                const cardId = textPicked[0]!;
                claimed.add(cardId);
                await ctx.fx.returnToHand([cardId]);
              }
            }

            // --- Selection 2: Place 1 card named "Vemmon" as bottom digivolution card ---
            const nameCandidates = revealed.filter(
              (c) => !claimed.has(c.instanceId) && hasVemmonName(ctx.game, c),
            );
            if (nameCandidates.length > 0 && ctx.source.isOnBattleArea()) {
              const namePicked = await ctx.ask.selectCards(ctx, {
                candidates: nameCandidates.map((c) => c.instanceId),
                min: 1,
                max: Math.min(1, nameCandidates.length),
              });
              if (namePicked.length > 0) {
                const placedCardId = namePicked[0]!;

                const eligibleDigimon = owner.battleArea.filter((p) => {
                  if (p.inBreeding) return false;
                  if (p.topCard === undefined) return false;
                  const def = ctx.game.definitionOf(p.topCard);
                  return def.kinds.includes(CardKind.Digimon);
                });

                if (eligibleDigimon.length > 0) {
                  const digiPicked = await ctx.ask.chooseTargets(ctx, {
                    candidates: eligibleDigimon.map((p) => p.permanentId),
                    min: 1,
                    max: 1,
                  });
                  if (digiPicked.length > 0) {
                    claimed.add(placedCardId);
                    await ctx.fx.placeUnder(digiPicked[0]!, [placedCardId]);
                  }
                }
              }
            }

            // --- Return remaining revealed cards to the bottom of the deck ---
            const rest = revealed
              .filter((c) => !claimed.has(c.instanceId))
              .map((c) => c.instanceId);
            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest, { toTop: false });
            }
          },
        }),
      ];
    }

    // (2) [Inherited][Your Turn][Once Per Turn] — digivolution cost -1 into Vemmon-text
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-evo-cost-reduction-vemmon`,
          description:
            "[Your Turn][Once Per Turn][Inherited] When one of your Digimon would " +
            "digivolve into a Digimon card with [Vemmon] in its text, reduce the " +
            "digivolution cost by 1.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            // When a digivolution INTO a Vemmon-text card is about to happen, reduce cost by 1.
            // The `into` predicate gates on the digivolution target having "Vemmon" in its text.
            ctx.fx.changeEvoCost(
              (m) => {
                if (m.into === undefined) return false;
                return hasVemmonTextDef(m.into);
              },
              -1,
            );
          },
        }),
      ];
    }

    return [];
  },
};

/** documented behavior CanSelectCardCondition: HasText("Vemmon") — checks if a card instance's definition has "Vemmon" in text. */
function hasVemmonText(game: GameAccess, c: { cardId: string }): boolean {
  const def = game.definitionOf({ cardId: c.cardId, ownerSeat: 0 } as Parameters<typeof game.definitionOf>[0]);
  return hasVemmonTextDef(def);
}

function hasVemmonTextDef(def: { effectText?: string; nameEn?: string; cardId?: string }): boolean {
  return (def.effectText ?? "").includes("Vemmon") || (def.nameEn ?? "").includes("Vemmon");
}

/** documented behavior CanSelectCardCondition1: CardNames.Contains("Vemmon") */
function hasVemmonName(game: GameAccess, c: { cardId: string }): boolean {
  const def = game.definitionOf({ cardId: c.cardId, ownerSeat: 0 } as Parameters<typeof game.definitionOf>[0]);
  return (def.nameEn ?? "").includes("Vemmon");
}

registerCard(module);
export default module;
