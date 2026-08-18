import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST2-12",
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnStartTurn)
      return [
        turnTiming({
          source,
          effectKey: "ST2-12/start-turn",
          description: "At start of your turn, if opponent has a sourceless Digimon, gain 1 memory.",
          when: (ctx) =>
            source.isOwnersTurn() &&
            ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.some(
                (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length === 0,
              ),
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: "ST2-12/security",
          description: "Play this card without paying its cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
