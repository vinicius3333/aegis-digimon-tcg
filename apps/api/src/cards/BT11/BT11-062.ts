import { CardColor, EffectTiming, isTamer } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-062";
async function reveal(ctx: EffectContext, source: CardSource): Promise<void> {
  const shown = await ctx.fx.reveal(source.ownerSeat, 3);
  const moved = new Set<string>();
  const visibleCards = shown.map(({ instanceId, cardId: shownCardId }) => ({ instanceId, cardId: shownCardId }));
  const groups = [
    shown.filter((card) => ["Greymon", "X Antibody"].some((name) => ctx.game.definitionOf(card).nameEn.includes(name))),
    shown.filter(
      (card) => isTamer(ctx.game.definitionOf(card)) && ctx.game.definitionOf(card).colors.includes(CardColor.Black),
    ),
  ];
  for (const group of groups) {
    const candidates = group.filter(({ instanceId }) => !moved.has(instanceId));
    if (candidates.length === 0) continue;
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map(({ instanceId }) => instanceId),
      min: 1,
      max: 1,
      visibleCards,
    });
    if (chosen[0] !== undefined) {
      moved.add(chosen[0]);
      await ctx.fx.returnToHand(chosen);
    }
  }
  let rest = shown.filter(({ instanceId }) => !moved.has(instanceId)).map(({ instanceId }) => instanceId);
  if (rest.length > 1 && ctx.ask.orderCards !== undefined)
    rest = await ctx.ask.orderCards(ctx, { candidates: rest, visibleCards, destination: "deckBottom" });
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description: "[On Play] Reveal 3, add a Greymon/X Antibody card and a black Tamer, bottom-deck the rest.",
          resolve: async (ctx) => reveal(ctx, source),
        }),
      ];
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-reveal`,
          description:
            "[When Digivolving] Reveal 3, add a Greymon/X Antibody card and a black Tamer, bottom-deck the rest.",
          resolve: async (ctx) => reveal(ctx, source),
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-leave-prevention`,
        description:
          "Inherited: place 1 X Antibody source at deck bottom to prevent a Greymon/Omnimon host leaving by effect.",
        isInherited: true,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeReplacement({
            event: "wouldLeavePlay",
            sourcePermanentId: host.permanentId,
            mode: "prevent",
            description: "BT11-062 inherited leave prevention",
            causeAllows: (cause) => cause === "byEffect",
            protects: (subCtx, leavingId) => {
              const leaving = subCtx.game.permanentById(leavingId);
              return (
                leavingId === host.permanentId &&
                leaving?.topCard !== undefined &&
                ["Greymon", "Omnimon"].some((name) => subCtx.game.definitionOf(leaving.topCard!).nameEn.includes(name))
              );
            },
            preventCheck: async (subCtx) => {
              const current = subCtx.game.permanentById(host.permanentId);
              if (current === undefined) return false;
              const candidates = current.stack.filter((card) =>
                subCtx.game.definitionOf(card).nameEn.includes("X Antibody"),
              );
              if (
                candidates.length === 0 ||
                !(await subCtx.ask.optional(subCtx, "Bottom-deck X Antibody to prevent leaving?"))
              )
                return false;
              const chosen = await subCtx.ask.selectCards(subCtx, {
                candidates: candidates.map(({ instanceId }) => instanceId),
                min: 1,
                max: 1,
              });
              return (await subCtx.fx.returnToDeck(chosen, { toTop: false })).length === 1;
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
