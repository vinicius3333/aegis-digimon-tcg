import { EffectDuration, EffectTiming, isDigimon, isTamer, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-059";
function greymonOrOmnimon(ctx: EffectContext, card: CardInstance): boolean {
  const def = ctx.game.definitionOf(card);
  return isDigimon(def) && matchNameOrTrait(def, { tokens: ["Greymon", "Omnimon"], match: "name" });
}
function tai(ctx: EffectContext, card: CardInstance): boolean {
  const def = ctx.game.definitionOf(card);
  return isTamer(def) && matchNameOrTrait(def, { tokens: ["Tai Kamiya"], match: "name" });
}
async function reveal(ctx: EffectContext, source: CardSource) {
  const shown = await ctx.fx.reveal(source.ownerSeat, 4);
  const visibleCards = shown.map(({ instanceId, cardId: shownCardId }) => ({ instanceId, cardId: shownCardId }));
  const moved = new Set<string>();
  for (const match of [greymonOrOmnimon, tai]) {
    const candidates = shown.filter((card) => !moved.has(card.instanceId) && match(ctx, card));
    if (!candidates.length) continue;
    const [picked] = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map(({ instanceId }) => instanceId),
      min: 1,
      max: 1,
      visibleCards,
    });
    if (picked) {
      moved.add(picked);
      await ctx.fx.returnToHand([picked]);
    }
  }
  let rest = shown.filter(({ instanceId }) => !moved.has(instanceId)).map(({ instanceId }) => instanceId);
  if (rest.length > 1 && ctx.ask.orderCards)
    rest = await ctx.ask.orderCards(ctx, { candidates: rest, visibleCards, destination: "deckBottom" });
  if (rest.length) await ctx.fx.returnToDeck(rest, { toTop: false });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description: "[On Play] Reveal 4; add a Greymon/Omnimon Digimon and a Tai Kamiya Tamer; bottom the rest.",
          resolve: (ctx) => reveal(ctx, source),
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-dp`,
          isInherited: true,
          description: "[All Turns] While this Digimon has Greymon/Omnimon in its name, it gets +1000 DP.",
          when: (ctx) => {
            const host = source.permanent();
            return (
              host?.topCard !== undefined &&
              matchNameOrTrait(ctx.game.definitionOf(host.topCard), { tokens: ["Greymon", "Omnimon"], match: "name" })
            );
          },
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host) ctx.fx.modifyDP(host.permanentId, 1000, EffectDuration.Permanent);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
