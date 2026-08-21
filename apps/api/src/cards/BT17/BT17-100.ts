import { EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT17-100 — Doomsday Clock (BT17, Black Option).
 *
 *
 * Effects:
 *   [Security] Add this card to the hand.
 *   [Main] Play 1 [Diaboromon] Token without paying the cost. Then, place this card as
 *     the bottom digivolution card of 1 of your [Diaboromon] without [Doomsday Clock]
 *     in its digivolution cards.
 *   [Start of Your Turn] If 4 [Doomsday Clock]s are placed in your battle area, you win.
 *   [Inherited][All Turns] When this Digimon would leave the battle area by an opponent's
 *     effect, by deleting 1 of your other [Diaboromon], prevent it from leaving.
 *   [Inherited][End of Opponent's Turn] Place 1 [Doomsday Clock] from this Digimon's
 *     digivolution cards in the battle area.
 *
 * KB Q2896: Can't place this card under a [Diaboromon] Token (cards can't go under tokens).
 * KB Q2897: When this card's [Start of Your Turn] activates, the controller wins.
 * KB Q2898: "would leave the battle area" = placed in trash, returned to hand/deck, placed
 *   in security, moved to breeding, or placed under another card.
 * KB Q2899: the [End of Opponent's Turn] ESS can place this card itself in the battle area
 *   when it is in a Digimon's digivolution cards.
 */

const cardId = "BT17-100";

const isDoomsDay = (c: CardInstance): boolean => c.cardId === cardId;
const _isDiaboromon = (c: CardInstance): boolean =>
  // Diaboromon named card (all sets) or Diaboromon Token
  c.cardId === "BT17-059" ||
  c.cardId === "BT2-082" ||
  c.cardId === "BT22-064" ||
  c.cardId === "BT5-084" ||
  c.cardId === "EX1-065" ||
  c.cardId === "EX6-043" ||
  c.cardId === "P-016" ||
  c.cardId === "P-114" ||
  c.cardId === "TOKEN-Diaboromon" ||
  c.cardId === "TOKEN-Diaboromon-Token";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] Add this card to the hand.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-add-to-hand`,
          description: "[Security] Add this card to the hand.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            // Card is in security zone; move to hand
            const idx = owner.security.findIndex((c) => c.instanceId === source.instanceId);
            if (idx !== -1) {
              const [card] = owner.security.splice(idx, 1);
              if (card) owner.hand.push(card);
            }
          },
        }),
      ];
    }

    // [Main] Play 1 [Diaboromon] Token without paying cost. Then, place this card as the
    // bottom digivolution card of 1 of your [Diaboromon] without [Doomsday Clock] in its
    // digivolution cards.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/on-use-option-play-token-place-under`,
          description:
            "[Main] Play 1 [Diaboromon] Token without paying the cost. Then, place this card " +
            "as the bottom digivolution card of 1 of your [Diaboromon] without [Doomsday Clock] " +
            "in its digivolution cards.",
          resolve: async (ctx) => {
            // Play 1 [Diaboromon] Token if there's a free battle-area slot.
            await ctx.fx.playToken(source.ownerSeat, "Diaboromon", { payCost: false });

            // Collect eligible [Diaboromon] non-token permanents without [Doomsday Clock]
            // in their digivolution cards.
            const owner = ctx.game.player(source.ownerSeat);
            const eligible = Array.from(owner.battleArea).filter((p: Permanent) => {
              if (!p.topCard) return false;
              // Must be named [Diaboromon] (not a token per KB Q2896)
              const def = ctx.game.definitionOf(p.topCard);
              if (!def.nameEn.includes("Diaboromon")) return false;
              // Must be a non-token permanent
              if (p.topCard.cardId.startsWith("TOKEN-")) return false;
              // Must not already have a [Doomsday Clock] in digivolution cards
              if (p.stack.some(isDoomsDay)) return false;
              return true;
            });
            if (eligible.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: eligible.map((p: Permanent) => p.permanentId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;
            // Place this Option card (source) as the bottom digivolution card.
            await ctx.fx.placeUnder(chosen[0]!, [source.instanceId]);
          },
        }),
      ];
    }

    // [Start of Your Turn] If 4 [Doomsday Clock]s are placed in your battle area, you win.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-your-turn-win`,
          description:
            "[Start of Your Turn] If 4 [Doomsday Clock]s are placed in your battle area, " + "you win the game.",
          when: (ctx) => ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const count = Array.from(owner.battleArea).filter(
              (p: Permanent) => p.topCard !== undefined && isDoomsDay(p.topCard),
            ).length;
            return count >= 4;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const count = Array.from(owner.battleArea).filter(
              (p: Permanent) => p.topCard !== undefined && isDoomsDay(p.topCard),
            ).length;
            if (count >= 4) {
              ctx.fx.declareWinner(source.ownerSeat);
            }
          },
        }),
      ];
    }

    // [Inherited][End of Opponent's Turn] Place 1 [Doomsday Clock] from this Digimon's
    // digivolution cards in the battle area.
    // KB Q2899: can place this card itself.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/inherited-eoot-place-doomsday-clock`,
          description:
            "[Inherited][End of Opponent's Turn] Place 1 [Doomsday Clock] from this Digimon's " +
            "digivolution cards in the battle area.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea() && !ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const host = ctx.source.permanent();
            if (!host) return false;
            return host.stack.some(isDoomsDay);
          },
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (!host) return;
            const clocks = host.stack.filter(isDoomsDay);
            if (clocks.length === 0) return;
            const candidates = clocks.map((c) => c.instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;
            // Place the [Doomsday Clock] Option from digivolution cards into battle area.
            await ctx.fx.placeOptionAsPermanent?.(chosen[0]!);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
