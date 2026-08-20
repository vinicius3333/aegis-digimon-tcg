import {
  CardKind,
  EffectDuration,
  EffectTiming,
  isDigimon,
  type CardDefinition,
  type CardInstance,
  type CompiledCard,
  type Permanent,
} from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT25-085";
const useOptionKey = `${cardId}/use-option`;
const unsuspendKey = `${cardId}/unsuspend`;

// Keep the printed static keyword and alternate evolution requirements available to the
// shared card-data/legality paths. The behavioral clauses below are handwritten because the
// generated IR cannot distinguish "this Digimon's" stack from all of the controller's stacks,
// or the link-card cost from the use-card source.
const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Three Musketeers"], match: "text" }],
            },
            raw: "you have a card w/[Three Musketeers] in text",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, texts: ["Three Musketeers"], cost: 3, isAlternate: true },
    { level: 5, traits: ["TS"], cost: 3, isAlternate: true },
  ],
};
const baseModule = irCardModule(cardId, compiled);

function isOption(def: CardDefinition): boolean {
  return def.kinds.includes(CardKind.Option);
}

function isMusketeerOrTs(def: CardDefinition): boolean {
  return cardHasTrait(def, "Three Musketeers") || cardHasTrait(def, "TS");
}

function ownDigimonHosts(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  const hosts = owner.battleArea.filter(
    (host) => host.topCard !== undefined && isDigimon(ctx.game.definitionOf(host.topCard)),
  );
  if (owner.breeding?.topCard !== undefined && isDigimon(ctx.game.definitionOf(owner.breeding.topCard))) {
    hosts.push(owner.breeding);
  }
  return hosts;
}

function faceUpOption(ctx: EffectContext, card: CardInstance): boolean {
  return card.faceUp !== false && isOption(ctx.game.definitionOf(card));
}

/** Options usable by this BeelStarmon: hand plus this exact Digimon's stack only. */
function useCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  const cards = owner.hand.filter((card) => {
    const def = ctx.game.definitionOf(card);
    return isOption(def) && isMusketeerOrTs(def);
  });
  const self = source.permanent();
  if (self !== undefined) {
    cards.push(
      ...self.stack.filter((card) => {
        const def = ctx.game.definitionOf(card);
        return faceUpOption(ctx, card) && isMusketeerOrTs(def);
      }),
    );
  }
  return cards;
}

/** All eligible cost cards, across every own Digimon's stack and link list. */
function unsuspendCostCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const cards: CardInstance[] = [];
  for (const host of ownDigimonHosts(ctx, source)) {
    cards.push(...host.stack.filter((card) => faceUpOption(ctx, card)));
    cards.push(...host.linked.filter((card) => faceUpOption(ctx, card)));
  }
  return cards;
}

async function useOption(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = useCandidates(ctx, source);
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((card) => card.instanceId),
    min: 0,
    max: 1,
  });
  const card = candidates.find((candidate) => candidate.instanceId === chosen[0]);
  if (card === undefined) return;

  // The use is free, but retain the printed cost for whenOptionUsed watchers. The primitive
  // resolves the selected Option's Main effect and trashes that exact physical instance.
  await ctx.fx.useOptionFromHand(ctx, card.instanceId, ctx.game.definitionOf(card).playCost, { payCost: false });
}

async function payUnsuspendCost(ctx: EffectContext, source: CardSource): Promise<boolean> {
  const candidates = unsuspendCostCandidates(ctx, source);
  if (candidates.length === 0) return false;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((card) => card.instanceId),
    min: 1,
    max: 1,
  });
  const instanceId = chosen[0];
  if (instanceId === undefined || !candidates.some((card) => card.instanceId === instanceId)) return false;

  // `trash` is an all-or-nothing move for this one-card payment: a restriction, stale zone,
  // or identity mismatch leaves the card in place and does not unsuspend BeelStarmon.
  const moved = await ctx.fx.trash([instanceId], { byEffectSeat: source.ownerSeat });
  return moved.length === 1 && moved[0]?.instanceId === instanceId;
}

async function unsuspend(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = source.permanent();
  if (self === undefined) return;
  if (await payUnsuspendCost(ctx, source)) await ctx.fx.unsuspend([self.permanentId]);
}

function useOptionEffect(source: CardSource, timing: EffectTiming): Effect {
  const builder = timing === EffectTiming.WhenDigivolving ? whenDigivolving : whenAttacking;
  return builder({
    source,
    effectKey: useOptionKey,
    description:
      "[Once Per Turn] You may use 1 [Three Musketeers] or [TS] Option from your hand or this Digimon's digivolution cards without paying the cost.",
    optional: true,
    maxPerTurn: 1,
    canActivate: (ctx) => useCandidates(ctx, source).length > 0,
    resolve: (ctx) => useOption(ctx, source),
  });
}

function unsuspendEffect(source: CardSource, timing: EffectTiming): Effect {
  const builder = timing === EffectTiming.WhenDigivolving ? whenDigivolving : whenAttacking;
  return builder({
    source,
    effectKey: unsuspendKey,
    description:
      "[Once Per Turn] By trashing 1 Option card from any of your Digimon's digivolution cards or link cards, this Digimon unsuspends.",
    optional: true,
    maxPerTurn: 1,
    canActivate: (ctx) => source.permanent() !== undefined && unsuspendCostCandidates(ctx, source).length > 0,
    resolve: (ctx) => unsuspend(ctx, source),
  });
}

function optionMainEffect(source: CardSource): Effect {
  return activated({
    source,
    effectKey: `${cardId}/option-main`,
    description:
      "[Main] Delete 1 of your opponent's highest level Digimon. Then, you may place 1 [Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution card.",
    resolve: async (ctx) => {
      const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
      const leveled = opponent.battleArea.filter((host) => {
        const top = host.topCard;
        return top !== undefined && isDigimon(ctx.game.definitionOf(top)) && (ctx.game.definitionOf(top).level ?? 0) > 0;
      });
      if (leveled.length > 0) {
        const highest = Math.max(...leveled.map((host) => ctx.game.definitionOf(host.topCard!).level ?? 0));
        const candidates = leveled.filter((host) => (ctx.game.definitionOf(host.topCard!).level ?? 0) === highest);
        const chosen =
          candidates.length === 1
            ? candidates[0]!.permanentId
            : (await ctx.ask.chooseTargets(ctx, { candidates: candidates.map((host) => host.permanentId), min: 1, max: 1 }))[0];
        if (chosen !== undefined) await ctx.fx.deletePermanent([chosen]);
      }

      const placeable = [...ctx.game.player(source.ownerSeat).hand, ...ctx.game.player(source.ownerSeat).trash].filter(
        (card) => card.instanceId !== source.instanceId && cardHasTrait(ctx.game.definitionOf(card), "Three Musketeers"),
      );
      const hosts = ownDigimonHosts(ctx, source);
      if (placeable.length === 0 || hosts.length === 0) return;
      const selected = await ctx.ask.selectCards(ctx, { candidates: placeable.map((card) => card.instanceId), min: 0, max: 1 });
      if (selected.length === 0) return;
      const host =
        hosts.length === 1
          ? hosts[0]!.permanentId
          : (await ctx.ask.chooseTargets(ctx, { candidates: hosts.map((candidate) => candidate.permanentId), min: 1, max: 1 }))[0];
      if (host !== undefined) await ctx.fx.placeUnder(host, selected, { belowTop: true, faceUp: true });
    },
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...baseModule.effectsForTiming(timing, source)];
    if (timing === EffectTiming.None) {
      effects.push(
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
          },
        }),
      );
    }
    if (timing === EffectTiming.OnUseOption) effects.push(optionMainEffect(source));
    if (timing === EffectTiming.WhenDigivolving || timing === EffectTiming.OnUseAttack) {
      effects.push(useOptionEffect(source, timing), unsuspendEffect(source, timing));
    }
    if (timing === EffectTiming.OnCounterTiming) effects.push(unsuspendEffect(source, timing));
    return effects;
  },
};

registerCard(module);
export default module;
