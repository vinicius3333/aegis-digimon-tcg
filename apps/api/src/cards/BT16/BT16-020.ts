import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT16-020";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) Static: inherited Jamming + alt digivolution requirement
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-jamming`,
          description: "[Inherited] <Jamming>",
          isInherited: true,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.Permanent);
          },
        }),
        // Alt digivolution requirement (Lv.3 [Night Claw]/[Light Fang] base, cost 2) is a
        // data override consumed by the engine's digivolve path — see file header.
      ];
    }

    // (2) [When Digivolving] Both players draw 1, then conditional gain 1 memory
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-draw-gain-memory`,
          description:
            "[When Digivolving] Both players draw 1 card from their decks. Then, " +
            "if your opponent has 8 or more cards in their hand or this Digimon has " +
            "3 or more digivolution cards, gain 1 memory.",
          resolve: async (ctx) => {
            const players = ctx.game.state.players;
            for (const player of players) {
              if (player.deck.length >= 1) {
                await ctx.fx.draw(player.seat, 1);
              }
            }

            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const oppHand = ctx.game.player(oppSeat).hand;
            const self = source.permanent();
            const digivolutionCount = self?.stack.length ?? 0;

            if (oppHand.length >= 8 || digivolutionCount >= 3) {
              // [When Digivolving] can be reached via an effect-driven (reactive) digivolve
              // on the opponent's turn -- credit this card's controller explicitly.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
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
