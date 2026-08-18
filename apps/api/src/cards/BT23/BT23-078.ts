import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT23-078 — Red Tamer (BT23, Goro Matayoshi).
//
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [Your Turn] When your Digimon are played or digivolve, if any of them have [Avian],
//   [Bird], [Beast], [Animal] or [Sovereign] in any of their traits (other than
//   [Sea Animal]) or the [CS] trait, by returning this Tamer to the hand, 1 of your
//   Digimon gets +3000 DP for the turn. Then, 1 of your Digimon may attack.
// [Security] Play this card without paying the cost.
//
// The "other than [Sea Animal]" exclusion cannot be expressed in the trait filter.
// The digivolve-on-field sub-trigger is BLOCKED (no whenPlayedOrDigivolved subscriber
// with trait gate). We implement the gain-memory and security effects only.

const cardId = "BT23-078";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            for (const p of opponent.battleArea) {
              if (p.topCard != null && isDigimon(ctx.game.definitionOf(p.topCard))) return true;
            }
            return false;
          },
          resolve: async (ctx) => {
            // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
            // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
            // owner explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
          },
        }),
      ];
    }

    // BLOCKED: [Your Turn] when Digimon played/digivolved with trait gate + return-to-hand cost
    //   + give +3000 DP + optional attack. The sub-trigger mechanism on whenPlayed/whenDigivolves
    //   with a trait filter is not yet available. The return-to-hand cost path would need
    //   BouncePeremanentAndProcessAccordingToResult in the Primitives.

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
