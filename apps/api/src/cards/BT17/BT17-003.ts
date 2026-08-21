import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Bibimon's inherited text is specifically about a Tamer card being placed by an
// effect. The generic compiler can identify the receiving permanent, but historically
// the onAddDigivolutionCards payload did not identify the cards added. This hand-authored
// implementation uses the now explicit payload to distinguish Tamers from Digimon/options.
const cardId = "BT17-003";

function addedCardIsTamer(ctx: EffectContext, hostId: string): boolean {
  const addedIds = ctx.trigger.addedDigivolutionCardInstanceIds ?? [];
  if (addedIds.length === 0) return false;
  const host = ctx.game.permanentById(hostId);
  if (host === undefined) return false;
  const stack = [...host.stack, ...host.linked];
  return addedIds.some((id) => {
    const card = stack.find((candidate: CardInstance) => candidate.instanceId === id);
    return card !== undefined && ctx.game.definitionOf(card).kinds.includes(CardKind.Tamer);
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/when-tamer-placed-in-stack-gain-memory`,
        description:
          "[Your Turn][Once Per Turn] When an effect places a Tamer card in this Digimon's " +
          "digivolution cards, gain 1 memory.",
        isInherited: true,
        maxPerTurn: 1,
        when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = ctx.source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "onAddDigivolutionCards",
            sourcePermanentId: host.permanentId,
            once: false,
            matches: (subCtx) =>
              subCtx.trigger.subjectPermanentId === host.permanentId && addedCardIsTamer(subCtx, host.permanentId),
            run: async (subCtx) => {
              subCtx.fx.gainMemory(1);
            },
            description: `${cardId}: gain memory when a Tamer is placed in this stack`,
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
