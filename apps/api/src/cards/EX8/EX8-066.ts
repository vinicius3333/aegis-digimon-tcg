import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Suzune Kazuki — EX8-066 (Blue Tamer).
//
// Clause 1 — [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
//   Fully implemented: turnTiming builder + canActivate opponent-Digimon guard.
//
// Clause 2 — [All Turns] When one of your Digimon is played or digivolves, if any of them
//   have the [Ice-Snow] trait, by suspending this Tamer, trash any 1 digivolution card from
//   your opponent's Digimon.
//   RESIDUAL: subTrigger bus has ZERO engine callers. The whenPlayed / whenDigivolving events
//   for battle-area Tamers are never fired by the engine. The clause is documented but no
//   effect is returned; it will remain inert until the sub-trigger dispatch is wired.
//
// Clause 3 — [Security] Play this card without paying the cost (self-play).
//   Fully implemented: security builder + ctx.fx.playFromSecurity.
const cardId = "EX8-066";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-gain-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            return ctx.game.player(opp).battleArea.some(
              (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [All Turns] clause — RESIDUAL: sub-trigger bus is unwired; no effect returned.
    // When the whenPlayed/whenDigivolving dispatch is implemented, wire:
    //   subjectHasIceSnowTrait check → if true, suspend this Tamer + trash 1 digivolution
    //   card from opponent's Digimon (chosen by the active player).

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/play-from-security`,
          description: "[Security] Play this card without paying the cost.",
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
