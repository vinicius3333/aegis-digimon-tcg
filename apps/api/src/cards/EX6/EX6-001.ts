import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-001";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Inherited [Your Turn] [Once Per Turn] watcher: when an effect adds a [Legend-Arms]
    // card to this Digimon's digivolution stack, gain 1 memory.
    // Installed as a continuous sub-trigger subscription while on the battle area.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/legend-arms-digi-add-gain-memory`,
          description:
            "[Your Turn] [Once Per Turn] [Inherited] When an effect places a card with the " +
            "[Legend-Arms] trait in this Digimon's digivolution cards, gain 1 memory.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/legend-arms-digi-add-gain-memory`,
              description: `${cardId} Legend-Arms digi-add gain 1 memory`,
              matches: (subCtx) => {
                //   1. Effect must be on the battle area and it's the owner's turn.
                //   2. The digivolution-card addition must be to THIS permanent (not another).
                //   3. The added card must have the [Legend-Arms] trait.
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined || subjectId !== self.permanentId) return false;
                // Only the cards placed by this event count. An existing Legend-Arms
                // card elsewhere in the stack must not make a later non-Legend-Arms
                // placement satisfy the trigger.
                const addedIds = subCtx.trigger?.addedDigivolutionCardInstanceIds ?? [];
                const perm = subCtx.game.permanentById(subjectId);
                if (perm === undefined) return false;
                return addedIds.some((instanceId) => {
                  const added = perm.stack.find((c) => c.instanceId === instanceId);
                  if (added === undefined) return false;
                  const def = subCtx.game.definitionOf(added);
                  return (def.types ?? []).includes("Legend-Arms");
                });
              },
              run: async (subCtx) => {
                subCtx.fx.gainMemory(1);
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
