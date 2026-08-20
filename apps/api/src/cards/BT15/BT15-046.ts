import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Woodmon — BT15-046 (Green Lv.4 Digimon).
//
// The declarative effect record was wrong: it emitted a bare "YourTurn" trigger with a Draw
// action but omitted the suspend-trigger guard entirely, so it would fire on every
// [Your Turn] window rather than only when one of your Digimon becomes suspended.
//
//   - IsExistOnBattleArea(card) — this card is in the battle area
//   - IsOwnerTurn(card)         — it is the owner's turn
//                              — the suspended permanent is one of YOUR battle-area Digimon
// maxCountPerTurn = 1, HashString "Draw1_BT15_046".
//
// KB (node tools/kb/query.mjs card BT15-046): no entries.
const cardId = "BT15-046";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn] [Once Per Turn] When one of your Digimon becomes suspended, <Draw 1>.
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/draw-on-your-digimon-suspend`,
          description:
            "[Your Turn] [Once Per Turn] When one of your Digimon becomes suspended, <Draw 1>.",
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            // The suspended permanent must be one of YOUR battle-area Digimon.
            const suspendedId = ctx.trigger.suspendedPermanentId;
            if (suspendedId === undefined) return false;
            const suspended = ctx.game.permanentById(suspendedId);
            if (suspended === undefined || suspended.topCard === undefined) return false;
            if (suspended.controllerSeat !== source.ownerSeat) return false;
            return isDigimon(ctx.game.definitionOf(suspended.topCard));
          },
          canActivate: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
