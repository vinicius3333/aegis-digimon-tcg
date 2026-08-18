import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-068";
async function revealTamer(ctx: EffectContext, source: CardSource): Promise<void> {
  const shown = await ctx.fx.reveal(source.ownerSeat, 5);
  const candidates = shown
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      return isTamer(def) && (def.playCost ?? 99) <= 4;
    })
    .map(({ instanceId }) => instanceId);
  const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
  if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
  const rest = shown.filter((card) => !chosen.includes(card.instanceId)).map(({ instanceId }) => instanceId);
  if (rest.length > 0) {
    const placement = await ctx.ask.chooseOption(ctx, ["deckTop", "deckBottom"]);
    const ordered =
      rest.length > 1 && ctx.ask.orderCards !== undefined
        ? await ctx.ask.orderCards(ctx, {
            candidates: rest,
            destination: placement === 0 ? "deckTop" : "deckBottom",
          })
        : rest;
    await ctx.fx.returnToDeck(ordered, { toTop: placement === 0 });
  }
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "Reveal 5 and play a cost-4-or-less Tamer.",
          resolve: (ctx) => revealTamer(ctx, source),
        }),
      ];
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description: "Reveal 5 and play a cost-4-or-less Tamer.",
          resolve: (ctx) => revealTamer(ctx, source),
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-blocker`,
          isInherited: true,
          maxPerTurn: 1,
          when: () => source.isOwnersTurn(),
          description: "When another Digimon is played by an effect, grant Blocker.",
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: host.permanentId,
              once: false,
              oncePerTurnKey: `${source.instanceId}/${cardId}/blocker`,
              description: "BT11-068 inherited",
              matches: (subCtx) =>
                subCtx.trigger.playedByEffect === true &&
                subCtx.trigger.subjectPermanentId !== host.permanentId &&
                source.isOwnersTurn(),
              run: async (subCtx) => {
                const candidates = subCtx.game
                  .player(source.ownerSeat)
                  .battleArea.filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)))
                  .map(({ permanentId }) => permanentId);
                const chosen = await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 });
                if (chosen[0] !== undefined)
                  subCtx.fx.grantKeyword(chosen[0], "Blocker", EffectDuration.UntilOpponentTurnEnd);
              },
            });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
