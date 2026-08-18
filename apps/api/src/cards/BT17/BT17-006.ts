import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { canDigivolveOnto } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

// Bowmon's inherited effect is a reaction to a Tamer being placed under THIS host;
// it is not a continuously re-fired Digivolve action. The generic record used to
// omit that event and could target any of the owner's Digimon.
const cardId = "BT17-006";

const isSoCDigimon = (def: CardDefinition): boolean =>
  def.kinds.includes(CardKind.Digimon) &&
  [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])].includes("SoC");

function addedCardIsTamer(ctx: EffectContext, hostId: string): boolean {
  const ids = ctx.trigger.addedDigivolutionCardInstanceIds ?? [];
  const host = ctx.game.permanentById(hostId);
  if (ids.length === 0 || host === undefined) return false;
  const stack = [...host.stack, ...host.linked];
  return ids.some((id) => {
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
        effectKey: `${cardId}/when-tamer-placed-digivolve-soc`,
        description:
          "[Your Turn][Once Per Turn] When an effect places a Tamer card in this Digimon's " +
          "digivolution cards, this Digimon may digivolve into a Digimon card with [SoC] " +
          "trait in your trash.",
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
              subCtx.trigger.subjectPermanentId === host.permanentId &&
              addedCardIsTamer(subCtx, host.permanentId),
            run: async (subCtx) => {
              const currentHost = subCtx.source.permanent();
              if (currentHost === undefined || currentHost.topCard === undefined) return;
              const owner = subCtx.game.player(source.ownerSeat);
              const base = subCtx.game.definitionOf(currentHost.topCard);
              const candidates = Array.from(owner.trash).filter((card) => {
                const def = subCtx.game.definitionOf(card);
                return isSoCDigimon(def) && canDigivolveOnto(def, base);
              });
              if (candidates.length === 0) return;
              const accepted = await subCtx.ask.optional(
                subCtx,
                "May this Digimon digivolve into a [SoC] Digimon from your trash?",
              );
              if (!accepted) return;
              const selected = await subCtx.ask.selectCards(subCtx, {
                candidates: candidates.map((card) => card.instanceId),
                min: 1,
                max: 1,
              });
              if (selected.length === 0) return;
              await subCtx.fx.digivolveFromInstance(currentHost.permanentId, selected[0]!, {
                payCost: true,
              });
            },
            description: `${cardId}: optional [SoC] digivolution from trash`,
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
