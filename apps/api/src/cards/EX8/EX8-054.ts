import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX8-054";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rush`,
          description: "＜Rush＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/piercing`,
          description: "＜Piercing＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Piercing", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack`,
          description: "＜Security A. +1＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-borrow`,
          description:
            "[When Attacking] [Once Per Turn] Activate a [When Digivolving] effect of a " +
            "[Justimon]-named card in this Digimon's digivolution cards as this Digimon's effect.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const justimonCard = self.stack.find((c) => {
              const def = ctx.game.definitionOf(c);
              return def.nameEn.includes("Justimon");
            });
            if (justimonCard === undefined) return;
            if (ctx.fx.conferStackEffects) {
              ctx.fx.conferStackEffects(self.permanentId, justimonCard.instanceId, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-attack`,
          description:
            "[End of Your Turn] [Once Per Turn] If your opponent has an unsuspended Digimon, " +
            "this Digimon may attack a player.",
          maxPerTurn: 1,
          optional: true,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            return Array.from(ctx.game.player(opponent).battleArea).some(
              (p) => !p.isSuspended,
            );
          },
          resolve: async (_ctx) => {
            // Attack-a-player capability: the engine handles this via the attack subsystem
            // The "may attack" is gated on optional:true above
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
