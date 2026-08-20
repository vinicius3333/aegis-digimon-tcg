import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT11-107 — Hades Force (BT11, Black/Red Option).
 *
 *
 *   EffectTiming.None ([Static] play-cost reduction):
 *     Cost -2 when playing BT11-107, conditioned on owning a Digimon whose
 *     DigivolutionCards contain "X Antibody" or "XAntibody". CardSourceCondition:
 *     cardSource == card (only BT11-107 itself benefits).
 *   EffectTiming.OptionSkill ([Main]):
 *     1. Choose any number of opponent's Digimon/Tamers whose combined play costs
 *        ≤ the play cost of 1 of your Digimon with [Greymon] in its name; delete all.
 *     2. Then, 1 of your Digimon with [Greymon] in its name may attack a player.
 *   EffectTiming.SecuritySkill ([Security]):
 *     Delete 1 of your opponent's Digimon with the highest play cost.
 *
 * The deletion selection uses DecisionApi.maxTotalPlayCost, so the same budget is
 * transported to the UI and revalidated by the authoritative decision path.
 */
const cardId = "BT11-107";

function hasXAntibodyInStack(p: Permanent, ctx: EffectContext): boolean {
  return p.stack.some((card) => {
    const def = ctx.game.definitionOf(card);
    return def.nameEn.includes("X Antibody") || def.nameEn.includes("XAntibody");
  });
}

function ownerHasGreymonDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  return ctx.game.player(source.ownerSeat).battleArea.filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard) as CardDefinition;
    return isDigimon(def) && def.nameEn.includes("Greymon");
  });
}

function opponentHighestPlayCost(ctx: EffectContext, source: CardSource): string[] {
  const oppSeat = ctx.game.opponentOf(source.ownerSeat);
  const digimon = ctx.game
    .player(oppSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    });
  if (digimon.length === 0) return [];
  const maxCost = Math.max(
    ...digimon.map((p) => (ctx.game.definitionOf(p.topCard!).playCost ?? 0)),
  );
  return digimon
    .filter((p) => (ctx.game.definitionOf(p.topCard!).playCost ?? 0) === maxCost)
    .map((p) => p.permanentId);
}

async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const greymons = ownerHasGreymonDigimon(ctx, source);
  if (greymons.length === 0) return;
  const [budgetPermanentId] = await ctx.ask.chooseTargets(ctx, {
    candidates: greymons.map(({ permanentId }) => permanentId),
    min: 1,
    max: 1,
  });
  const budgetPermanent = budgetPermanentId === undefined
    ? undefined
    : ctx.game.permanentById(budgetPermanentId);
  if (budgetPermanent?.topCard === undefined) return;
  const budget = ctx.game.definitionOf(budgetPermanent.topCard).playCost ?? 0;

  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const opposingCards = opponent.battleArea.filter((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(permanent.topCard);
    return isDigimon(definition) || isTamer(definition);
  });
  if (opposingCards.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: opposingCards.map(({ permanentId }) => permanentId),
      min: 0,
      max: opposingCards.length,
      maxTotalPlayCost: budget,
    });
    if (chosen.length > 0) await ctx.fx.deletePermanent(chosen, "byEffect");
  }

  // Step 2: 1 of your Greymon-named Digimon may attack a player.
  const candidates = ownerHasGreymonDigimon(ctx, source)
    .filter((permanent) => !permanent.isSuspended)
    .map((permanent) => permanent.permanentId);
  if (candidates.length === 0) return;
  const willAttack = await ctx.ask.optional(
    ctx,
    "1 of your [Greymon]-named Digimon may attack a player.",
  );
  if (!willAttack) return;
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  for (const id of chosen) {
    await ctx.fx.forceAttack(id);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Static] Reduce play cost by 2 when you own a Digimon with [X Antibody] in digivolution cards.
    if (timing === EffectTiming.None) {
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/play-cost-reduction`,
          description:
            "Reduce the play cost of this card by 2 if you have a Digimon with [X Antibody] in its digivolution cards (documented behavior).",
          when: (ctx) => {
            return ctx.game.player(ctx.source.ownerSeat).battleArea.some((p) => {
              if (p.inBreeding || p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard) as CardDefinition;
              return isDigimon(def) && hasXAntibodyInStack(p, ctx);
            });
          },
          resolve: async (ctx) => {
            // CardSourceCondition: cardSource == card (only BT11-107 itself).
            ctx.fx.changePlayCost(
              (facts) =>
                facts.controllerSeat === ctx.source.ownerSeat &&
                (facts.def as CardDefinition).cardId === cardId,
              -2,
            );
          },
        }),
      ];
    }

    // [Main]
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Choose any number of your opponent's Digimon and Tamers whose combined " +
            "play costs are ≤ the play cost of 1 of your [Greymon]-named Digimon, and delete " +
            "all. Then, 1 of your [Greymon]-named Digimon may attack a player.",
          optional: false,
          resolve: async (ctx) => resolveMain(ctx, source),
        }),
      ];
    }

    // [Security] Delete 1 of your opponent's Digimon with the highest play cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description:
            "[Security] Delete 1 of your opponent's Digimon with the highest play cost.",
          optional: false,
          resolve: async (ctx) => {
            const candidates = opponentHighestPlayCost(ctx, source);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            await ctx.fx.deletePermanent(chosen, "byEffect");
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
