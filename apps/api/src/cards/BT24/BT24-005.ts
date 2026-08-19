import { CardKind, EffectTiming, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT24-005";

function addedCardIsTamer(ctx: EffectContext, hostId: string): boolean {
  const addedIds = ctx.trigger?.addedDigivolutionCardInstanceIds ?? [];
  if (addedIds.length === 0) return false;
  const host = ctx.game.permanentById(hostId);
  if (host === undefined) return false;
  const stack = [...host.stack, ...host.linked];
  return addedIds.some((id) => {
    const card = stack.find((candidate: CardInstance) => candidate.instanceId === id);
    return card !== undefined && ctx.game.definitionOf(card).kinds.includes(CardKind.Tamer);
  });
}

async function revealTopOrBottom(ctx: EffectContext, source: CardSource): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
  if (revealed.length === 0) return;
  const destination = await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"]);
  await ctx.fx.returnToDeck(
    revealed.map((card) => card.instanceId),
    { toTop: destination === 0 },
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/tamer-placed-reveal`,
        description:
          "[Your Turn][Once Per Turn] When a Tamer card is placed in this Digimon's digivolution cards, reveal the top 3 cards and return them to the top or bottom of the deck.",
        isInherited: true,
        maxPerTurn: 1,
        when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
        canActivate: (ctx) => source.isOnBattleArea(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "onAddDigivolutionCards",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTurnKey: `${cardId}/tamer-placed-reveal`,
            matches: (subCtx) =>
              subCtx.trigger?.subjectPermanentId === host.permanentId && addedCardIsTamer(subCtx, host.permanentId),
            run: async (subCtx) => revealTopOrBottom(subCtx, source),
            description: `${cardId}: reveal 3 when a Tamer is placed in this stack`,
          });
        },
      }),
    ];
  },
};

registerCard(module);
export default module;
