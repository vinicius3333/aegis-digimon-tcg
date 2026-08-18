import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-080";
async function reveal(ctx: EffectContext, source: CardSource): Promise<void> {
  const shown = await ctx.fx.reveal(source.ownerSeat, 3);
  const candidates = shown
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      return isDigimon(def) && (def.colors.includes(CardColor.Black) || def.colors.includes(CardColor.Purple));
    })
    .map(({ instanceId }) => instanceId);
  const taken = candidates.length ? await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 }) : [];
  if (taken.length) await ctx.fx.returnToHand(taken);
  let rest = shown.filter(({ instanceId }) => !taken.includes(instanceId)).map(({ instanceId }) => instanceId);
  if (!rest.length) return;
  if (ctx.ask.orderCards) rest = await ctx.ask.orderCards(ctx, { candidates: rest, destination: "deckTop" });
  const destination = await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"]);
  await ctx.fx.returnToDeck(rest, { toTop: destination === 0 });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description: "Reveal 3, add a purple or black Digimon, and return the rest to deck top or bottom.",
          resolve: (ctx) => reveal(ctx, source),
        }),
      ];
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-reveal`,
          description: "Reveal 3, add a purple or black Digimon, and return the rest to deck top or bottom.",
          resolve: (ctx) => reveal(ctx, source),
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-blocker`,
          description: "＜Blocker＞",
          isInherited: true,
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host) ctx.fx.grantKeyword(host.permanentId, "Blocker", EffectDuration.Permanent);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
