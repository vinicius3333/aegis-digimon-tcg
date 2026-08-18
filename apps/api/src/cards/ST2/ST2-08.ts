import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const module: EffectModule = {
  cardId: "ST2-08",
  effectsForTiming(timing, source): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: "ST2-08/inherited-security-attack",
        isInherited: true,
        description: "Your turn: while opponent has a sourceless Digimon, gain Security Attack +1.",
        when: (ctx) =>
          source.isOwnersTurn() &&
          ctx.game
            .player(ctx.game.opponentOf(source.ownerSeat))
            .battleArea.some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.stack.length === 0,
            ),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host !== undefined) ctx.fx.grantKeyword(host.permanentId, "SecurityAttack", EffectDuration.Permanent, 1);
        },
      }),
    ];
  },
};
registerCard(module);
