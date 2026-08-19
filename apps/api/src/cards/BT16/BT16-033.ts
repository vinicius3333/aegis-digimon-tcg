import { EffectTiming, EffectDuration } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT16-033 — Harpymon (BT16, Yellow Lv.4 Digimon).
 *
 *
 *   1. EffectTiming.WhenPermanentWouldBeDeleted — <Armor Purge> keyword
 *
 *   2. Alternate digivolution requirement: [Hawkmon] base, cost 2.
 *      Carried as data in @aegis/shared digivolution overrides; not modeled here.
 *   3. EffectTiming.OnSecurityCheck [Your Turn] — when this Digimon checks
 *      the opponent's security stack: if you have ≤2 security cards, Recovery +1;
 *      if ≥3, gain 1 memory.
 *      KB Q2629: "If this card leaves the battle area due to the revealed card's
 *      [Security] effect, this card's [Your Turn] effect does NOT activate."
 */

const cardId = "BT16-033";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // <Armor Purge>: static keyword — when this Digimon would be deleted, you
    // may trash the top card of its digivolution cards to prevent deletion.
    // The engine enforces the behavior through the keyword consumer in the
    // deletion seam; this block grants the keyword as a permanent static.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/armor-purge`,
          description: "<Armor Purge>",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.grantKeyword(self.permanentId, "Armor Purge", EffectDuration.Permanent);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnSecurityCheck) {
      const effect: Effect = {
        effectKey: `${cardId}/on-security-check-recovery-or-memory`,
        description:
          "[Your Turn] When this Digimon checks your opponent's security stack, recover 1 if you have 2 or fewer security cards; otherwise gain 1 memory.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => {
          const self = source.permanent();
          return self !== undefined && source.isOwnersTurn() && ctx.trigger.attackerPermanentId === self.permanentId;
        },
        canActivate: () => true,
        resolve: async (ctx) => {
          if (ctx.game.player(source.ownerSeat).security.length <= 2) {
            await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
          } else {
            ctx.fx.gainMemory(1);
          }
        },
      };
      return [effect];
    }

    return [];
  },
};

registerCard(module);
export default module;
