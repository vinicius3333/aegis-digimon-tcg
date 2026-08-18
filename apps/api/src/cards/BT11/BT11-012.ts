import { EffectDuration, EffectTiming, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-012";

function xrosHeartOrBlueFlare(ctx: EffectContext, card: CardInstance): boolean {
  const definition = ctx.game.definitionOf(card);
  return matchNameOrTrait(definition, { tokens: ["Xros Heart", "Blue Flare"], match: "trait" });
}

async function revealAndAdd(ctx: EffectContext, source: CardSource): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
  const candidates = revealed.filter((card) => xrosHeartOrBlueFlare(ctx, card));
  const visibleCards = revealed.map(({ instanceId, cardId: visibleCardId }) => ({ instanceId, cardId: visibleCardId }));
  const chosen =
    candidates.length === 0
      ? []
      : await ctx.ask.selectCards(ctx, {
          candidates: candidates.map(({ instanceId }) => instanceId),
          min: Math.min(2, candidates.length),
          max: Math.min(2, candidates.length),
          visibleCards,
        });
  if (chosen.length > 0) await ctx.fx.returnToHand(chosen);
  const taken = new Set(chosen);
  let rest = revealed.filter(({ instanceId }) => !taken.has(instanceId)).map(({ instanceId }) => instanceId);
  if (rest.length > 1 && ctx.ask.orderCards !== undefined) {
    rest = await ctx.ask.orderCards(ctx, { candidates: rest, visibleCards, destination: "deckBottom" });
  }
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/material-save`,
          description: "＜Material Save 2＞",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "MaterialSave", EffectDuration.Permanent, 2);
          },
        }),
      ];
    }
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-delete-memory`,
          description: "[Start of Your Turn] By deleting this Digimon, gain 1 memory.",
          optional: true,
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const deleted = await ctx.fx.deletePermanent([self.permanentId]);
            if (deleted > 0) ctx.fx.gainMemory(1);
          },
        }),
      ];
    }
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description: "[On Play] Reveal 3, add 2 [Xros Heart]/[Blue Flare] cards, bottom the rest.",
          resolve: (ctx) => revealAndAdd(ctx, source),
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
