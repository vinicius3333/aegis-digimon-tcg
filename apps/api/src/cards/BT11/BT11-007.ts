import { CardColor, EffectTiming, isDigimon, isTamer, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, onPlay } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-007";

function redVaccine(ctx: EffectContext, card: CardInstance): boolean {
  const definition = ctx.game.definitionOf(card);
  return (
    isDigimon(definition) &&
    definition.colors.includes(CardColor.Red) &&
    matchNameOrTrait(definition, { tokens: ["Vaccine"], match: "trait" })
  );
}

function redTamer(ctx: EffectContext, card: CardInstance): boolean {
  const definition = ctx.game.definitionOf(card);
  return isTamer(definition) && definition.colors.includes(CardColor.Red);
}

async function resolveReveal(ctx: EffectContext, source: CardSource): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
  const visibleCards = revealed.map(({ instanceId, cardId: visibleCardId }) => ({ instanceId, cardId: visibleCardId }));
  const moved = new Set<string>();
  for (const matches of [redVaccine, redTamer]) {
    const candidates = revealed.filter((card) => !moved.has(card.instanceId) && matches(ctx, card));
    if (candidates.length === 0) continue;
    const [chosen] = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map(({ instanceId }) => instanceId),
      min: 1,
      max: 1,
      visibleCards,
    });
    if (chosen !== undefined) {
      moved.add(chosen);
      await ctx.fx.returnToHand([chosen]);
    }
  }
  let rest = revealed.filter(({ instanceId }) => !moved.has(instanceId)).map(({ instanceId }) => instanceId);
  if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
    rest = await ctx.ask.orderCards(ctx, { candidates: rest, visibleCards, destination: "deckBottom" });
  }
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal 3. Add 1 red [Vaccine] Digimon and 1 red Tamer; " +
            "place the rest at deck bottom in any order.",
          resolve: (ctx) => resolveReveal(ctx, source),
        }),
      ];
    }
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/inherited-deletion-memory`,
          description: "[On Deletion] If you have a red Tamer in play, gain 1 memory.",
          isInherited: true,
          canActivate: (ctx) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some((permanent) => permanent.topCard !== undefined && redTamer(ctx, permanent.topCard)),
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
