import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT4-092 — Red Tamer (BT4).
 *
 *
 * [Start of Your Turn] If you have 2 or fewer memory, set it to 3.
 * [Your Turn] When one of your Digimon with [Greymon] in its name attacks
 *   (except DoruGreymon, BurningGreymon, DexDoruGreymon), you may suspend
 *   this Tamer to gain 1 memory.
 * [Security] Play this card without paying the memory cost.
 */
const cardId = "BT4-092";

const EXCLUDED_NAMES = new Set(["DoruGreymon", "BurningGreymon", "DexDoruGreymon"]);

function isGreymonAttacker(name: string): boolean {
  if (!name.includes("Greymon")) return false;
  if (EXCLUDED_NAMES.has(name)) return false;
  return true;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If memory ≤ 2, set it to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/set-memory-3`,
          description: "[Start of Your Turn] If you have 2 or fewer memory, set it to 3.",
          optional: false,
          when: (ctx) =>
            ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn() && ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    // [Your Turn] When Greymon Digimon attacks, optionally suspend this Tamer to gain 1 memory.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          attackScope: "ally",
          effectKey: `${cardId}/greymon-attack-memory`,
          description:
            "[Your Turn] When one of your Digimon with [Greymon] in its name attacks " +
            "(except DoruGreymon, BurningGreymon, DexDoruGreymon), you may suspend " +
            "this Tamer to gain 1 memory.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const attackerId = ctx.trigger.attackerPermanentId;
            if (attackerId === undefined) return false;
            const attacker = ctx.game.permanentById(attackerId);
            if (attacker === undefined || attacker.topCard === undefined) return false;
            if (attacker.controllerSeat !== source.ownerSeat) return false;
            const def = ctx.game.definitionOf(attacker.topCard);
            if (!isDigimon(def)) return false;
            return isGreymonAttacker(def.nameEn);
          },
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            return self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            await ctx.fx.suspend([self.permanentId]);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/play-from-security`,
          description: "[Security] Play this card without paying the memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
