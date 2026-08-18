import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * P-064 — Jellymon Tamer (Rina), P, Blue Tamer.
 *
 * source: documented behavior.
 *
 * Two clauses:
 *   1. OnAllyAttack: When a Digimon with [Jellymon] in its digivolution cards attacks, you may
 *      suspend this Tamer to have that Digimon gain <Jamming> for the turn.
 *      checking for Jellymon in digivolution sources), suspend self (Tap), then
 *      GainJamming(target: attacking permanent, duration: UntilEachTurnEnd).
 *   2. SecuritySkill: Play this Tamer from security.
 */
const cardId = "P-064";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) OnAllyAttack: suspend self → grant Jamming to the attacking Digimon.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/on-ally-attack-grant-jamming`,
          description:
            "[Your Turn] When you attack with a Digimon that has [Jellymon] in its " +
            "digivolution cards, you may suspend this Tamer to have that Digimon gain " +
            "<Jamming> for the turn.",
          optional: true,
          attackScope: "ally",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;

            // Check attacking Digimon has Jellymon in digivolution cards.
            const attackerId = ctx.trigger.attackerPermanentId;
            if (attackerId === undefined) return false;
            const attacker = ctx.game.permanentById(attackerId);
            if (attacker === undefined || attacker.topCard === undefined) return false;
            const hasJellymon = attacker.stack.some(
              (c) => ctx.game.definitionOf(c).nameEn === "Jellymon",
            );
            return hasJellymon;
          },
          canActivate: (ctx) => {
            //      CanActivateSuspendCostEffect(card)
            const self = ctx.source.permanent();
            if (self === undefined || self.isSuspended) return false;
            return ctx.source.isOnBattleArea();
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            const attackerId = ctx.trigger.attackerPermanentId;

            const suspended = await ctx.fx.suspend([self.permanentId]);
            if (!suspended.includes(self.permanentId)) return;

            if (attackerId !== undefined) {
              ctx.fx.grantKeyword(attackerId, "Jamming", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    // (2) Security: Play this Tamer from security.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
