import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-066";
async function grantBlocker(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = ctx.game
    .player(source.ownerSeat)
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    )
    .map(({ permanentId }) => permanentId);
  if (!candidates.length) return;
  const [picked] = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (picked) ctx.fx.grantKeyword(picked, "Blocker", EffectDuration.UntilOpponentTurnEnd);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    const options = {
      source,
      effectKey: `${cardId}/grant-blocker`,
      description: "1 of your Digimon gains Blocker until the end of your opponent's turn.",
      resolve: (ctx: EffectContext) => grantBlocker(ctx, source),
    };
    if (timing === EffectTiming.OnPlay) return [onPlay(options)];
    if (timing === EffectTiming.WhenDigivolving) return [whenDigivolving(options)];
    return [];
  },
};
registerCard(module);
export default module;
