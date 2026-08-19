import { CardKind, EffectDuration, EffectTiming, type CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT21-092";
const isXrosHeart = (def: CardDefinition): boolean => (def.types ?? []).includes("Xros Heart");
const isDigimon = (def: CardDefinition): boolean => def.kinds.includes(CardKind.Digimon);

async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const sourceCandidates = owner.battleArea.filter(
    (p) =>
      p.topCard !== undefined &&
      isXrosHeart(ctx.game.definitionOf(p.topCard)) &&
      p.stack.some((c) => isDigimon(ctx.game.definitionOf(c))),
  );
  const tamers = owner.battleArea.filter(
    (p) => p.topCard !== undefined && ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Tamer),
  );
  if (sourceCandidates.length === 0 || tamers.length === 0) return;
  const chosenSource = await ctx.ask.selectPermanents(ctx, {
    candidates: sourceCandidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  if (chosenSource.length === 0) return;
  const chosenTamer = await ctx.ask.selectPermanents(ctx, {
    candidates: tamers.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  if (chosenTamer.length === 0) return;
  const sourcePermanent = ctx.game.permanentById(chosenSource[0]!);
  if (sourcePermanent === undefined) return;
  let stackIds = sourcePermanent.stack.filter((c) => isDigimon(ctx.game.definitionOf(c))).map((c) => c.instanceId);
  if (stackIds.length === 0) return;
  if (ctx.ask.orderCards !== undefined)
    stackIds = await ctx.ask.orderCards(ctx, {
      candidates: stackIds,
      visibleCards: sourcePermanent.stack
        .filter((c) => stackIds.includes(c.instanceId))
        .map((c) => ({ instanceId: c.instanceId, cardId: c.cardId })),
    });
  await ctx.fx.placeUnder(chosenTamer[0]!, [...stackIds].reverse());
  const handCandidates = owner.hand
    .filter((c) => isDigimon(ctx.game.definitionOf(c)) && isXrosHeart(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);
  if (handCandidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, { candidates: handCandidates, min: 0, max: 1 });
  if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: true, costDelta: stackIds.length });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const owner = source.ownerSeat;
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/color-waiver`,
          description: "While you have a [Xros Heart] Digimon, ignore this card's color requirements.",
          when: (ctx) =>
            ctx.game
              .player(owner)
              .battleArea.some((p) => p.topCard !== undefined && isXrosHeart(ctx.game.definitionOf(p.topCard))),
          resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd),
        }),
      ];
    }
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-move-stack-play`,
          description:
            "[Main] Place all Digimon cards from a [Xros Heart] Digimon under a Tamer, then play a [Xros Heart] Digimon from hand with the cost reduced by the number placed.",
          optional: false,
          resolve: async (ctx) => resolveMain(ctx, source),
        }),
      ];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] You may play a [Xros Heart] card costing 5 or less, then add this card to hand.",
          optional: false,
          resolve: async (ctx) => {
            const cards = ctx.game
              .player(owner)
              .hand.concat(ctx.game.player(owner).trash)
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isXrosHeart(def) && def.playCost <= 5;
              });
            const chosen =
              cards.length > 0
                ? await ctx.ask.selectCards(ctx, { candidates: cards.map((c) => c.instanceId), min: 0, max: 1 })
                : [];
            if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
