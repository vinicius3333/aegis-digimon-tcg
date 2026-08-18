import { EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT10-011";
const gammamonName = "gammamon";

/** This card's own battle-area permanent (the inherited host when it is a source). */
function self(ctx: EffectContext, source: CardSource): Permanent | undefined {
  return source.permanent();
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // --- [Your Turn][Once Per Turn] When one of your Tamers becomes suspended ---------
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/dp-and-security-on-your-tamer-suspend`,
          description:
            "[Your Turn] [Once Per Turn] When one of your Tamers becomes suspended, this Digimon gets +2000 DP for the turn. Then, if this Digimon has 12000 DP or more, it gains ＜Security Attack +1＞ for the turn.",
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            // The suspended permanent must be one of YOUR battle-area Tamers (Q1938: the
            // event is a single firing regardless of how many suspend at once).
            const suspendedId = ctx.trigger.suspendedPermanentId;
            if (suspendedId === undefined) return false;
            const suspended = ctx.game.permanentById(suspendedId);
            if (suspended === undefined || suspended.topCard === undefined) return false;
            if (suspended.controllerSeat !== source.ownerSeat) return false;
            return isTamer(ctx.game.definitionOf(suspended.topCard));
          },
          canActivate: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = self(ctx, source);
            if (me === undefined) return;
            ctx.fx.modifyDP(me.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
            // "Then, if this Digimon has 12000 DP or more" — evaluated AFTER the +2000 gain.
            // modifyDP updates currentDP synchronously, so this is already the post-gain
            // value. Adding the delta again would grant Security Attack at only 10000 DP.
            const dpAfterGain = me.currentDP ?? 0;
            if (dpAfterGain >= 12000) {
              ctx.fx.grantKeyword(me.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
            }
          },
        }),
      ];
    }

    // --- [All Turns] gains all effects of [Gammamon]-named digivolution cards ---------
    if (timing === EffectTiming.None) {
      const conferGammamon = (effectKey: string, isInherited: boolean): Effect =>
        staticModifier({
          source,
          effectKey,
          description:
            "[All Turns] This Digimon gains all effects of cards with [Gammamon] in their names in this Digimon's digivolution cards.",
          optional: false,
          isInherited,
          resolve: async (ctx) => {
            const me = self(ctx, source);
            if (me === undefined) return;
            for (const stackCard of me.stack) {
              const def = ctx.game.definitionOf(stackCard);
              if (!(def.nameEn ?? "").toLowerCase().includes(gammamonName)) continue;
              ctx.fx.conferStackEffects(me.permanentId, stackCard.instanceId, EffectDuration.Permanent);
            }
          },
        });
      return [
        conferGammamon(`${cardId}/all-turns-gammamon-effects`, false),
        // The same [All Turns] grant is also inherited (it works while this card is itself
        // a digivolution source under another of your Digimon).
        conferGammamon(`${cardId}/all-turns-gammamon-effects-inherited`, true),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
