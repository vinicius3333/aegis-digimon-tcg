import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "LM-009";

function hasAngoramonInText(def: CardDefinition): boolean {
  return def.nameEn.includes("Angoramon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/angoramon-cost-reduction`,
          description:
            "[Your Turn] When a card with [Angoramon] in its text would be played, or one of your " +
            "Digimon would digivolve into such a card, by suspending this Digimon, reduce the play " +
            "or digivolution cost by 2.",
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenSuspended",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When suspended (other than own cost), give Rush to Angoramon.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                if (self.isSuspended) return false;
                return true;
              },
              run: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                for (const p of owner.battleArea) {
                  if (p.topCard !== undefined && hasAngoramonInText(subCtx.game.definitionOf(p.topCard))) {
                    subCtx.fx.grantKeyword(p.permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
                  }
                }
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/angoramon-rush`,
          description:
            "[Your Turn] When this Digimon becomes suspended (other than by its own cost), " +
            "1 of your Digimon with [Angoramon] in its text gains ＜Rush＞ for the turn.",
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenSuspended",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When suspended (other than own cost), give Rush to Angoramon.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                return true;
              },
              run: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                const targets = Array.from(owner.battleArea)
                  .filter((p) => p.topCard !== undefined && hasAngoramonInText(subCtx.game.definitionOf(p.topCard)))
                  .map((p) => p.permanentId);
                if (targets.length > 0) {
                  const chosen = await subCtx.ask.chooseTargets(subCtx, { candidates: targets, min: 1, max: 1 });
                  if (chosen.length > 0) {
                    subCtx.fx.grantKeyword(chosen[0]!, "Rush", EffectDuration.UntilEachTurnEnd);
                  }
                }
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
