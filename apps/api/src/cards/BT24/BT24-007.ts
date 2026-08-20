import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT24-007 — Tsunomon (Purple Lv.2 Digi-Egg).
 *
 *
 * [Your Turn][Once Per Turn] When level 4 or higher Digimon cards with the
 * [Demon] or [Titan] trait are trashed from your hand, you may play 1 of them
 * with the play cost reduced by 2.
 */
const cardId = "BT24-007";

function cardCondition(def: CardDefinition): boolean {
  return (
    isDigimon(def) &&
    def.level !== undefined &&
    def.level >= 4 &&
    (def.types ?? []).some((t) => t === "Demon" || t === "Titan")
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/trash-hand-play-demon-titan`,
          description:
            "[Your Turn][Once Per Turn] When level 4 or higher Digimon cards with the " +
            "[Demon] or [Titan] trait are trashed from your hand, you may play 1 of them " +
            "with the play cost reduced by 2.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/trash-hand-play-demon-titan`,
              description: `${cardId}: When lv4+ Demon/Titan Digimon trashed from hand, play with cost -2.`,
              matches: (subCtx) => {
                return (
                  subCtx.trigger?.handTrashedSeat === source.ownerSeat &&
                  subCtx.source.isOnBattleArea() &&
                  subCtx.source.isOwnersTurn()
                );
              },
              run: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                const eligible = owner.trash.filter((c) => cardCondition(subCtx.game.definitionOf(c)));
                if (eligible.length === 0) return;

                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: eligible.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length === 0) return;

                await subCtx.fx.playInstances(chosen, {
                  payCost: true,
                  costDelta: 2,
                });
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
