import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-088 — Hiroko Sagisaka (BT26, Red Tamer, TS).
//
// The committed KB has no card-specific ruling for BT26-088. The implementation follows
// the catalog text and the engine's verified cross-permanent play-cost reducer seam.
//
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [Your Turn] When any [Boss] or [TS] trait Digimon cards would be played, by suspending this
//   Tamer, reduce the costs by 1. If you have no Digimon, instead reduce the costs by 2.
//
// Clause 1 follows BT26-093's start-of-main gate: `OnStartMainPhase` fires board-wide, so the
// card checks `isOnBattleArea() && isOwnersTurn()` itself. "If your opponent has a Digimon" is
// an activation condition, so it gates both `when` and the resolve body (the board can change
// between the two). The clause states no cost, so it is mandatory.
//
// The [Your Turn] replacement is collected by GameEngine's cross-permanent pay-time seam,
// where the optional suspension is paid before the final play cost is charged.

const cardId = "BT26-088";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

function opponentHasDigimon(ctx: EffectContext, ownerSeat: Seat): boolean {
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  return Array.from(ctx.game.player(opponentSeat).battleArea).some(
    (permanent) =>
      !permanent.inBreeding && permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-gain-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) =>
            ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn() && opponentHasDigimon(ctx, source.ownerSeat),
          resolve: async (ctx) => {
            if (!opponentHasDigimon(ctx, source.ownerSeat)) return;
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
