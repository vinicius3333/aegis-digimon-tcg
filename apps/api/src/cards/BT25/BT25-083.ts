import { CardKind, EffectTiming, isDigimon, type CardDefinition, type CompiledCard } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDeletion, onPlay, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT25-083";
const sharedUseKey = `${cardId}/trash-source-use-option`;
const requirements: CompiledCard = {
  effects: [],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 4, texts: ["Three Musketeers"], cost: 3, isAlternate: true },
    { level: 4, traits: ["TS"], cost: 3, isAlternate: true },
  ],
};
const baseModule = irCardModule(cardId, requirements);

function hasThreeMusketeersTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("Three Musketeers");
}

// Q6393: "in its text" spans every printed card field, not only effectText.
function hasThreeMusketeersInFullText(def: CardDefinition): boolean {
  return JSON.stringify(def).includes("Three Musketeers");
}

function ownDigimonHosts(ctx: EffectContext) {
  return ctx.game
    .player(ctx.source.ownerSeat)
    .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
}

function placementCards(ctx: EffectContext): string[] {
  const owner = ctx.game.player(ctx.source.ownerSeat);
  return [...owner.hand, ...owner.trash]
    .filter((card) => hasThreeMusketeersTrait(ctx.game.definitionOf(card)))
    .map((card) => card.instanceId);
}

async function placeTraitCardAndDraw(ctx: EffectContext): Promise<void> {
  const cards = placementCards(ctx);
  const hosts = ownDigimonHosts(ctx);
  if (cards.length === 0 || hosts.length === 0) return;
  const chosenCard = await ctx.ask.selectCards(ctx, { candidates: cards, min: 1, max: 1 });
  if (chosenCard.length !== 1) return;
  const chosenHost = await ctx.ask.chooseTargets(ctx, {
    candidates: hosts.map((host) => host.permanentId),
    min: 1,
    max: 1,
  });
  if (chosenHost.length !== 1) return;
  const placed = await ctx.fx.placeUnder(chosenHost[0]!, chosenCard, { belowTop: false, faceUp: true });
  if (placed.length === 1) await ctx.fx.draw(ctx.source.ownerSeat, 1);
}

function sourceOptionCosts(ctx: EffectContext): Array<{ hostId: string; instanceId: string }> {
  return ownDigimonHosts(ctx).flatMap((host) =>
    host.stack
      .filter((card) => (ctx.game.definitionOf(card).kinds as string[]).includes(CardKind.Option as string))
      .map((card) => ({ hostId: host.permanentId, instanceId: card.instanceId })),
  );
}

function trashOptions(ctx: EffectContext): string[] {
  return ctx.game
    .player(ctx.source.ownerSeat)
    .trash.filter((card) => {
      const def = ctx.game.definitionOf(card);
      return (def.kinds as string[]).includes(CardKind.Option as string) && hasThreeMusketeersTrait(def);
    })
    .map((card) => card.instanceId);
}

async function trashSourceThenUseOption(ctx: EffectContext): Promise<void> {
  const costs = sourceOptionCosts(ctx);
  const chosenCost = await ctx.ask.selectCards(ctx, {
    candidates: costs.map((cost) => cost.instanceId),
    min: 1,
    max: 1,
  });
  const cost = costs.find((candidate) => candidate.instanceId === chosenCost[0]);
  if (cost === undefined) return;
  const trashed = await ctx.fx.trashDigivolutionCards(cost.hostId, [cost.instanceId]);
  if (!trashed.some((card) => card.instanceId === cost.instanceId)) return;

  // Recompute after paying the cost: Q6395 permits using the same physical dual Option.
  const options = trashOptions(ctx);
  const chosenOption = await ctx.ask.selectCards(ctx, { candidates: options, min: 0, max: 1 });
  if (chosenOption.length !== 1) return;
  const option = ctx.game.player(ctx.source.ownerSeat).trash.find((card) => card.instanceId === chosenOption[0]);
  if (option === undefined) return;
  await ctx.fx.useOptionFromHand(ctx, option.instanceId, ctx.game.definitionOf(option).playCost, {
    payCost: true,
    costDelta: 3,
  });
}

function placementEffect(source: CardSource, timing: EffectTiming): Effect {
  const make = timing === EffectTiming.OnPlay ? onPlay : whenDigivolving;
  return make({
    source,
    effectKey: `${cardId}/${timing === EffectTiming.OnPlay ? "on-play" : "when-digivolving"}-place-draw`,
    description: "By placing 1 [Three Musketeers] trait card as a bottom digivolution card, Draw 1.",
    optional: true,
    canActivate: (ctx) => placementCards(ctx).length > 0 && ownDigimonHosts(ctx).length > 0,
    resolve: placeTraitCardAndDraw,
  });
}

function sourceOptionEffect(source: CardSource, timing: EffectTiming): Effect {
  const make = timing === EffectTiming.WhenDigivolving ? whenDigivolving : whenAttacking;
  const effect = make({
    source,
    effectKey: sharedUseKey,
    description:
      "[Once Per Turn] By trashing 1 Option from your Digimon's sources, use a [Three Musketeers] Option from trash with cost -3.",
    optional: true,
    maxPerTurn: 1,
    canActivate: (ctx) => sourceOptionCosts(ctx).length > 0,
    resolve: trashSourceThenUseOption,
  });
  return effect;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing === EffectTiming.OnPlay) effects.push(placementEffect(source, timing));
    if (timing === EffectTiming.WhenDigivolving) {
      effects.push(placementEffect(source, timing), sourceOptionEffect(source, timing));
    }
    if (timing === EffectTiming.OnUseAttack) effects.push(sourceOptionEffect(source, timing));
    if (timing === EffectTiming.OnDestroyedAnyone) {
      effects.push(
        onDeletion({
          source,
          effectKey: `${cardId}/inherited-on-deletion-play`,
          description:
            "[On Deletion] Play 1 level 4 or lower Digimon with [Three Musketeers] in its text from trash free.",
          optional: true,
          isInherited: true,
          canActivate: (ctx) =>
            ctx.game.player(ctx.source.ownerSeat).trash.some((card) => {
              const def = ctx.game.definitionOf(card);
              return isDigimon(def) && (def.level ?? 99) <= 4 && hasThreeMusketeersInFullText(def);
            }),
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(ctx.source.ownerSeat)
              .trash.filter((card) => {
                const def = ctx.game.definitionOf(card);
                return isDigimon(def) && (def.level ?? 99) <= 4 && hasThreeMusketeersInFullText(def);
              })
              .map((card) => card.instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 1) await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      );
    }
    return effects;
  },
};

registerCard(module);
export default module;
