import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT23-082 — Yellow Tamer (BT23, Makiko Date).
//
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [Your Turn] When any of your Digimon digivolve into a Digimon with the [Beastkin],
//   [Holy Beast], [Cherub] or [CS] trait, by returning this Tamer to the hand, you may
//   play 1 [Lopmon] or level 3 Digimon card with the [CS] trait from your hand without
//   paying the cost.
// [Security] Play this card without paying the cost.
//
// The digivolve-into trait gate sub-trigger is BLOCKED (requires whenOneOfYoursDigivolves
// with digivolveIntoFilter — LANE_H.md CAP-H-07). We implement the gain-memory and
// security effects only.

const cardId = "BT23-082";

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

    // BLOCKED: [Your Turn] digivolve-into gate + return-to-hand cost.
    //   Requires whenOneOfYoursDigivolves SubTrigger with digivolveIntoFilter.

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
