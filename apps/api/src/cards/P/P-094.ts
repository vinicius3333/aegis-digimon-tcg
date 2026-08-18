import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * P-094 — Destromon, P, Black Lv.6 Digimon.
 *
 * source: documented behavior.
 *
 * Four clauses:
 *   1. EffectTiming.None (DigiXros): DigiXrosRequirement: 1 Snatchmon + 5 Vemmon.
 *   2. OnPlay / WhenDigivolving (shared): Delete opponent Digimon/Tamer up to total play cost
 *      of 3 + Vemmon count in digivolution cards.
 *      SharedCanSelectPermanentCondition: opponent battle area, IsDigimon || IsTamer, has play cost <= maxCost
 *   3. OnAllyAttack (inherited, OncePerTurn): Place 2 Vemmon from Galacticmon's digivolution
 *      cards to deck bottom to redirect attack to this Digimon.
 */
const cardId = "P-094";

/** Count Vemmon digivolution cards under this permanent. */
function vemmonCount(ctx: EffectContext, source: CardSource): number {
  const self = source.permanent();
  if (self === undefined) return 0;
  return self.stack.filter((c) => ctx.game.definitionOf(c).nameEn === "Vemmon").length;
}

/**
 * Max play cost budget: 3 + Vemmon count in digivolution cards.
 */
function maxCost(ctx: EffectContext, source: CardSource): number {
  return 3 + vemmonCount(ctx, source);
}

/** Opponent battle-area permanents that are Digimon or Tamer with play cost <= budget. */
function deletableOpponentPermanentIds(
  ctx: EffectContext,
  source: CardSource,
  budget: number,
): string[] {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const ids: string[] = [];
  for (const p of opponent.battleArea) {
    if (p.inBreeding) continue;
    const top = p.topCard;
    if (top === undefined) continue;
    const def = ctx.game.definitionOf(top);
    if (!isDigimon(def) && !isTamer(def)) continue;
    if (def.playCost === undefined) continue;
    if (def.playCost > budget) continue;
    ids.push(p.permanentId);
  }
  return ids;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) OnPlay: Delete opponent Digimon/Tamer up to total play cost of 3 + Vemmon count.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-budget-delete`,
          description:
            "[On Play] Delete your opponent's Digimon and Tamers with a total play cost of 3. " +
            "For every [Vemmon] in this Digimon's digivolution cards, increase the maximum " +
            "play cost you can choose by this effect by 1.",
          optional: false,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self === undefined || self.topCard === undefined) return false;
            return isDigimon(ctx.game.definitionOf(self.topCard));
          },
          canActivate: (ctx) => {
            const budget = maxCost(ctx, source);
            return deletableOpponentPermanentIds(ctx, source, budget).length >= 1;
          },
          resolve: async (ctx) => {
            const budget = maxCost(ctx, source);
            const candidates = deletableOpponentPermanentIds(ctx, source, budget);
            if (candidates.length === 0) return;

            await selectAndDeleteWithBudget(ctx, source, candidates, budget);
          },
        }),
      ];
    }

    // (2) WhenDigivolving: Same budget-delete as OnPlay.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-budget-delete`,
          description:
            "[When Digivolving] Delete your opponent's Digimon and Tamers with a total play " +
            "cost of 3. For every [Vemmon] in this Digimon's digivolution cards, increase " +
            "the maximum play cost you can choose by this effect by 1.",
          optional: false,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self === undefined || self.topCard === undefined) return false;
            return isDigimon(ctx.game.definitionOf(self.topCard));
          },
          canActivate: (ctx) => {
            const budget = maxCost(ctx, source);
            return deletableOpponentPermanentIds(ctx, source, budget).length >= 1;
          },
          resolve: async (ctx) => {
            const budget = maxCost(ctx, source);
            const candidates = deletableOpponentPermanentIds(ctx, source, budget);
            if (candidates.length === 0) return;

            await selectAndDeleteWithBudget(ctx, source, candidates, budget);
          },
        }),
      ];
    }

    // (3) OnAllyAttack (inherited, OncePerTurn): Redirect attack by placing Vemmon
    //     from Galacticmon's digivolution sources to deck bottom.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-redirect-attack`,
          description:
            "[Opponent's Turn] [Once Per Turn] When an opponent's Digimon attacks, by " +
            "placing 2 [Vemmon] from 1 of your [Galacticmon]'s digivolution cards at the " +
            "bottom of their owners' decks, switch the target of attack to this Digimon.",
          isInherited: true,
          maxPerTurn: 1,
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (ctx.game.state.turnSeat === source.ownerSeat) return false;

            const attackerId = ctx.trigger.attackerPermanentId;
            if (attackerId === undefined) return false;
            const attacker = ctx.game.permanentById(attackerId);
            if (attacker === undefined) return false;
            return attacker.controllerSeat !== source.ownerSeat;
          },
          canActivate: (ctx) => {
            // with >= 2 Vemmon in digivolution cards
            return findGalacticmonWithVemmon(ctx, source).length >= 1;
          },
          resolve: async (ctx) => {
            const galacticmonIds = findGalacticmonWithVemmon(ctx, source);
            if (galacticmonIds.length === 0) return;

            const chosenGM = await ctx.ask.chooseTargets(ctx, {
              candidates: galacticmonIds,
              min: 1,
              max: 1,
            });
            if (chosenGM.length === 0) return;

            const gmPermanent = ctx.game.permanentById(chosenGM[0]!);
            if (gmPermanent === undefined) return;

            // maxCount: 2, canEndNotMax: false, canNoSelect: () => false
            const vemmonCards = gmPermanent.stack.filter(
              (c) => ctx.game.definitionOf(c).nameEn === "Vemmon",
            );
            if (vemmonCards.length < 2) return;

            const vemmonIds = vemmonCards.map((c) => c.instanceId);
            const chosenCards = await ctx.ask.selectCards(ctx, {
              candidates: vemmonIds,
              min: 2,
              max: 2,
            });
            if (chosenCards.length !== 2) return;

            await ctx.fx.returnToDeck(chosenCards, { toTop: false });

            const self = source.permanent();
            if (self !== undefined) {
              await ctx.fx.redirectAttack([self.permanentId]);
            }
          },
        }),
      ];
    }

    return [];
  },
};

/** Find Galacticmon permanents with >= 2 Vemmon in digivolution cards. */
function findGalacticmonWithVemmon(
  ctx: EffectContext,
  source: CardSource,
): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    const top = p.topCard;
    if (top === undefined) continue;
    if (ctx.game.definitionOf(top).nameEn !== "Galacticmon") continue;
    const vemmonCount = p.stack.filter(
      (c) => ctx.game.definitionOf(c).nameEn === "Vemmon",
    ).length;
    if (vemmonCount >= 2) ids.push(p.permanentId);
  }
  return ids;
}

/**
 * Budget-constrained multi-delete: select opponent permanents whose total play cost
 * doesn't exceed `budget`. When only 1 eligible permanent, auto-delete it. When
 * multiple, prompt for selection keeping sumCost <= budget.
 */
async function selectAndDeleteWithBudget(
  ctx: EffectContext,
  source: CardSource,
  _candidates: string[],
  budget: number,
): Promise<void> {
  // Recompute candidates with current budget (budget may change mid-resolution)
  const candidates = deletableOpponentPermanentIds(ctx, source, budget);

  if (candidates.length === 0) return;

  if (candidates.length === 1) {
    await ctx.fx.deletePermanent([candidates[0]!]);
    return;
  }

  // canEndSelectCondition: sumCost(permanents) <= maxCost() && count > 0
  // canTargetCondition_ByPreSelecetedList: sumCost(selected + candidate) <= maxCost()
  const selected: string[] = [];
  const remaining = [...candidates];

  while (remaining.length > 0) {
    // Filter: adding this candidate must not exceed budget
    const validNext = remaining.filter((id) => {
      const p = ctx.game.permanentById(id);
      if (p === undefined || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      const currentSum = selected.reduce((sum, selId) => {
        const sp = ctx.game.permanentById(selId);
        if (sp === undefined || sp.topCard === undefined) return sum;
        return sum + (ctx.game.definitionOf(sp.topCard).playCost ?? 0);
      }, 0);
      return currentSum + (def.playCost ?? 0) <= budget;
    });

    if (validNext.length === 0) break;

    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: validNext,
      min: 1,
      max: 1,
    });

    if (chosen.length === 0) break;

    selected.push(chosen[0]!);
    const idx = remaining.indexOf(chosen[0]!);
    if (idx >= 0) remaining.splice(idx, 1);

    // Ask if player wants to stop selecting
    const wantMore = await ctx.ask.optional(ctx, "Select another card to delete?");
    if (!wantMore) break;
  }

  if (selected.length > 0) {
    await ctx.fx.deletePermanent(selected);
  }
}

registerCard(module);
export default module;
