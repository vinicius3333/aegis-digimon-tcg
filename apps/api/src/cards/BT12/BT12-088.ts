import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT12-088 — Takuya Kanbara (BT12, In-Training-inherited Digi-Egg).
 *
 * [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
 * [Your Turn] (inherited) This Digimon gets +2000 DP. While this Digimon has 10000 or more
 *   DP, it gains "[Your Turn] [Once Per Turn] When this Digimon checks an opponent's
 *   security, gain 2 memory."
 * [Security] Play this card without paying the cost.
 *
 * Migration note: the middle clause was originally a SubTrigger on "whenChecksSecurity", a
 * name declared in SubTriggerEventName but never fired anywhere — the correct live
 * equivalent is EffectTiming.OnSecurityCheck (a normal timing window, fired for every
 * security check regardless of outcome; precedent: BT22-080, EX5-053, BT16-033). Since the
 * IR interpreter has no case mapping a compiled trigger to that timing, converted the whole
 * module to a hand-written EffectModule (mirroring BT22-080's raw-Effect-literal pattern)
 * rather than adding IR support for a card whose other two clauses are already simple
 * enough to write directly.
 */
const cardId = "BT12-088";
const DP_THRESHOLD = 10000;

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If you have 2 memory or less, set your memory to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-memory`,
          description: "[Start of Your Turn] If you have 2 memory or less, set your memory to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    // [Your Turn] (inherited) +2000 DP, always on while inherited.
    if (timing === EffectTiming.None) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-dp-buff`,
          description: "[Your Turn] This Digimon gets +2000 DP.",
          isInherited: true,
          when: (ctx) => ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.modifyDP(self.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [Your Turn] [Once Per Turn] (inherited, DP-gated) When this Digimon checks security,
    // gain 2 memory. No timing builder exists for OnSecurityCheck; the Effect is constructed
    // directly (card-module contract: one-off card logic), mirroring BT22-080. The DP
    // check is read at ACTIVATION time (not when the check was declared), so a mid-check DP
    // drop below 10000 (e.g. a [Security] effect) blocks it.
    if (timing === EffectTiming.OnSecurityCheck) {
      const effect: Effect = {
        effectKey: `${cardId}/on-security-check-gain-memory`,
        description:
          "[Your Turn] [Once Per Turn] When this Digimon checks an opponent's security, " +
          "if it has 10000 or more DP, gain 2 memory.",
        optional: false,
        isInherited: true,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: 1,
        canTrigger: (ctx) => {
          const self = source.permanent();
          if (self === undefined) return false;
          if (ctx.trigger?.attackerPermanentId !== self.permanentId) return false;
          if (!source.isOwnersTurn()) return false;
          return self.currentDP >= DP_THRESHOLD;
        },
        canActivate: () => true,
        resolve: async (ctx) => {
          ctx.fx.gainMemory(2);
        },
      };
      return [effect];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
