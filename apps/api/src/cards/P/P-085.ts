import { EffectTiming, isDigimon, isTamer, CardColor } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-085";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] If you have a purple Tamer in play and it's your turn, you may digivolve " +
            "this Digimon into an [Undead] or [Dark Animal] trait Digimon from your trash.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.battleArea).some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isTamer(def) && def.colors.includes(CardColor.Purple);
            });
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              const types = def.types ?? [];
              return isDigimon(def) && (types.includes("Undead") || types.includes("Dark Animal"));
            });
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.digivolveFromInstance(self.permanentId, chosen[0]!, {
                  payCost: true,
                  ignoreRequirements: false,
                });
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
