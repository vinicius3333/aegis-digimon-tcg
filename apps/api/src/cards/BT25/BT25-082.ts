import { EffectTiming, isTamer, type CardDefinition, type CompiledCard } from "@aegis/shared";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onPlay, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { irCardModule, matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT25-082";
const requirements: CompiledCard = {
  effects: [],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 3, texts: ["Three Musketeers"], cost: 2, isAlternate: true },
    { level: 3, traits: ["TS"], cost: 2, isAlternate: true },
  ],
};
const baseModule = irCardModule(cardId, requirements);

function hasMusketeersText(definition: CardDefinition): boolean {
  return matchNameOrTrait(definition, { tokens: ["Three Musketeers"], match: "text" });
}

function tamerCount(ctx: EffectContext): number {
  return ctx.game
    .player(ctx.source.ownerSeat)
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && isTamer(ctx.game.definitionOf(permanent.topCard)),
    ).length;
}

function tamerCandidates(ctx: EffectContext): string[] {
  return ctx.game
    .player(ctx.source.ownerSeat)
    .hand.filter((card) => {
      const definition = ctx.game.definitionOf(card);
      return isTamer(definition) && hasMusketeersText(definition);
    })
    .map((card) => card.instanceId);
}

function freeTamerEffect(source: CardSource, timing: EffectTiming): Effect {
  const make = timing === EffectTiming.OnPlay ? onPlay : whenDigivolving;
  return make({
    source,
    effectKey: `${cardId}/${timing === EffectTiming.OnPlay ? "on-play" : "when-digivolving"}-play-tamer`,
    description: "If you have 1 or fewer Tamers, play a Tamer with [Three Musketeers] in its text free.",
    optional: true,
    canActivate: (ctx) => tamerCount(ctx) <= 1 && tamerCandidates(ctx).length > 0,
    resolve: async (ctx) => {
      const chosen = await ctx.ask.selectCards(ctx, { candidates: tamerCandidates(ctx), min: 1, max: 1 });
      if (chosen.length === 1) await ctx.fx.playInstances(chosen, { payCost: false });
    },
  });
}

function placementCandidates(ctx: EffectContext): string[] {
  const player = ctx.game.player(ctx.source.ownerSeat);
  return [...player.hand, ...player.trash]
    .filter((card) => cardHasTrait(ctx.game.definitionOf(card), "Three Musketeers"))
    .map((card) => card.instanceId);
}

function inheritedPlacement(source: CardSource): Effect {
  return whenAttacking({
    source,
    effectKey: `${cardId}/inherited-place-draw`,
    description: "[Once Per Turn] Place a [Three Musketeers] card as the bottom source to Draw 1.",
    optional: true,
    isInherited: true,
    maxPerTurn: 1,
    canActivate: (ctx) => source.permanent() !== undefined && placementCandidates(ctx).length > 0,
    resolve: async (ctx) => {
      const host = source.permanent();
      if (host === undefined) return;
      const chosen = await ctx.ask.selectCards(ctx, { candidates: placementCandidates(ctx), min: 1, max: 1 });
      if (chosen.length !== 1) return;
      const placed = await ctx.fx.placeUnder(host.permanentId, chosen, { belowTop: false, faceUp: true });
      if (placed.length === 1) await ctx.fx.draw(source.ownerSeat, 1);
    },
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing === EffectTiming.OnPlay || timing === EffectTiming.WhenDigivolving)
      effects.push(freeTamerEffect(source, timing));
    if (timing === EffectTiming.OnAllyAttack) effects.push(inheritedPlacement(source));
    return effects;
  },
};

registerCard(module);
export default module;
