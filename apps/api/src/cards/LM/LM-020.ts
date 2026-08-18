import { CardKind, EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** The 4 declarable "card categories" (KB Q4004: a category with no legal deck copies, e.g.
 * DigiEgg, is still declarable). */
const CARD_CATEGORIES = [CardKind.Digimon, CardKind.Tamer, CardKind.Option, CardKind.DigiEgg] as const;

const cardId = "LM-020";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] [Once Per Turn] By placing 1 Digimon on top of its owner's " +
            "security stack, reveal all of your opponent's security cards, place 1 among them " +
            "on top of your opponent's deck, then shuffle the rest back.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.battleArea).some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const digimon = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (digimon.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: digimon,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;
            const perm = ctx.game.permanentById(chosen[0]!);
            if (perm === undefined || perm.topCard === undefined) return;
            await ctx.fx.addSecurity(perm.controllerSeat, [perm.topCard.instanceId], { toTop: true });
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const oppSec = Array.from(opp.security).map((c) => c.instanceId);
            if (oppSec.length > 0) {
              const toDeck = await ctx.ask.selectCards(ctx, {
                candidates: oppSec,
                min: 0,
                max: 1,
              });
              if (toDeck.length > 0) {
                await ctx.fx.returnToDeck(toDeck, { toTop: true });
              }
            }
          },
        }),
      ];
    }

    // [Start of Opponent's Turn] Declare 1 card category. Reveal the top card of your
    // opponent's deck. If that card is of the declared category, this Digimon isn't affected
    // by the effects of that card category for the turn. Return the revealed card to the top
    // or the bottom of your opponent's deck. (Q4003 errata; Q4004: every category, including
    // one with no legal copies such as [DigiEgg], is declarable.)
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-opponent-turn-declare-category`,
          description:
            "[Start of Opponent's Turn] Declare 1 card category. Reveal the top card of your " +
            "opponent's deck. If that card is of the declared category, this Digimon isn't " +
            "affected by the effects of that card category for the turn. Return the revealed " +
            "card to the top or the bottom of your opponent's deck.",
          when: (ctx) => ctx.source.isOnBattleArea() && !ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);

            const categoryIdx = await ctx.ask.chooseOption(
              ctx,
              CARD_CATEGORIES.map((k) => `Declare category: ${k}`),
            );
            const category = CARD_CATEGORIES[categoryIdx] ?? CARD_CATEGORIES[0]!;

            const [revealed] = await ctx.fx.reveal(oppSeat, 1);
            if (revealed === undefined) return;

            const matches = ctx.game.definitionOf(revealed).kinds.includes(category);
            if (matches) {
              const self = source.permanent();
              if (self !== undefined) {
                ctx.fx.restrict(self.permanentId, "beAffected", EffectDuration.UntilEachTurnEnd, {
                  fromSourceKind: [category],
                });
              }
            }

            // Return the revealed card to the top or the bottom of the opponent's deck.
            const toTopIdx = await ctx.ask.chooseOption(ctx, [
              "Return to the top of the deck",
              "Return to the bottom of the deck",
            ]);
            revealed.faceUp = false;
            if (toTopIdx !== 0) {
              const deckIdx = opp.deck.findIndex((c) => c.instanceId === revealed.instanceId);
              if (deckIdx >= 0) {
                opp.deck.splice(deckIdx, 1);
                opp.deck.push(revealed);
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
