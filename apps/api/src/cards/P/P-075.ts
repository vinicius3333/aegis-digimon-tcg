import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-075";

function hasInsectoid(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Insectoid");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/suspension-lose-memory`,
          description:
            "[Your Turn] When this Digimon digivolves into an [Insectoid] trait Digimon, all of " +
            "your opponent's Digimon gain '[All Turns] When this Digimon suspends, lose 1 memory' " +
            "until the opponent's turn ends.",
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            // This is the main effect of P-075, not an inherited aura. Arm it only while
            // P-075 itself is the top card; the one-shot survives the recompute caused by
            // digivolution and consumes the event for this exact permanent.
            if (self === undefined || self.topCard.instanceId !== source.instanceId) return;
            const selfId = self.permanentId;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: selfId,
              once: true,
              description: `${cardId}: this Digimon digivolved into an Insectoid.`,
              matches: (subCtx) => subCtx.trigger.subjectPermanentId === selfId,
              run: async (subCtx) => {
                const evolved = subCtx.game.permanentById(selfId);
                if (evolved === undefined || !hasInsectoid(subCtx.game.definitionOf(evolved.topCard))) return;
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                for (const permanent of subCtx.game.player(opponent).battleArea) {
                  if (!isDigimon(subCtx.game.definitionOf(permanent.topCard))) continue;
                  const grantedId = permanent.permanentId;
                  subCtx.fx.subscribeSubTrigger({
                    event: "whenSuspended",
                    sourcePermanentId: grantedId,
                    once: false,
                    expiresOnTurnEndOf: opponent,
                    description: `${cardId}: this opponent Digimon loses 1 memory when suspended.`,
                    matches: (eventCtx) => eventCtx.trigger.suspendedPermanentId === grantedId,
                    run: async (eventCtx) => {
                      eventCtx.fx.gainMemory(-1);
                    },
                  });
                }
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/piercing-aura`,
          description:
            "While this Digimon has the [Insectoid] trait, it gains ＜Piercing＞.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined || self.topCard === undefined) return;
            const def = ctx.game.definitionOf(self.topCard);
            if (hasInsectoid(def)) {
              ctx.fx.grantKeyword(self.permanentId, "Piercing", EffectDuration.UntilEachTurnEnd);
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
