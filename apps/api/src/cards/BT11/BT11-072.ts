import { EffectTiming } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onDeletion, onPlay, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-072";
async function reveal(ctx: EffectContext, source: CardSource): Promise<void> {
  const shown = await ctx.fx.reveal(source.ownerSeat, 5);
  const used = new Set<string>();
  const analog = shown
    .filter((card) => ctx.game.definitionOf(card).nameEn.includes("Analogman"))
    .map(({ instanceId }) => instanceId);
  const pickedAnalog = await ctx.ask.selectCards(ctx, { candidates: analog, min: 0, max: 1 });
  if (pickedAnalog.length > 0) {
    used.add(pickedAnalog[0]!);
    await ctx.fx.returnToHand(pickedAnalog);
  }
  const machines = shown
    .filter(
      (card) =>
        !used.has(card.instanceId) &&
        ctx.game.definitionOf(card).types?.some((trait) => trait.includes("Cyborg") || trait.includes("Machine")) ===
          true,
    )
    .map(({ instanceId }) => instanceId);
  const picked = await ctx.ask.selectCards(ctx, { candidates: machines, min: 0, max: 1 });
  if (picked.length > 0) {
    used.add(picked[0]!);
    const self = source.permanent();
    if (self !== undefined && (await ctx.ask.optional(ctx, "Place this card under Machinedramon?")))
      await ctx.fx.placeUnder(self.permanentId, picked, { belowTop: false });
    else await ctx.fx.returnToHand(picked);
  }
  const rest = shown.filter((card) => !used.has(card.instanceId)).map(({ instanceId }) => instanceId);
  if (rest.length > 0) await ctx.fx.trash(rest);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnPlay)
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "Reveal 5; take Analogman and a Cyborg/Machine.",
          resolve: (ctx) => reveal(ctx, source),
        }),
      ];
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description: "Reveal 5; take Analogman and a Cyborg/Machine.",
          resolve: (ctx) => reveal(ctx, source),
        }),
      ];
    if (timing === EffectTiming.OnDestroyedAnyone)
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion`,
          optional: true,
          description: "Bottom-deck Analogman to play Machinedramon from hand.",
          resolve: async (ctx) => {
            const analogs = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (p) => p.topCard !== undefined && ctx.game.definitionOf(p.topCard).nameEn.includes("Analogman"),
              );
            const machines = ctx.game
              .player(source.ownerSeat)
              .hand.filter((card) => ctx.game.definitionOf(card).nameEn.includes("Machinedramon"));
            if (analogs.length === 0 || machines.length === 0) return;
            const pay = await ctx.ask.chooseTargets(ctx, {
              candidates: analogs.map(({ permanentId }) => permanentId),
              min: 0,
              max: 1,
            });
            if (pay[0] === undefined) return;
            const permanent = ctx.game.permanentById(pay[0]);
            if (permanent?.topCard === undefined) return;
            await ctx.fx.returnToDeck([permanent.topCard.instanceId], { toTop: false });
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: machines.map(({ instanceId }) => instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
