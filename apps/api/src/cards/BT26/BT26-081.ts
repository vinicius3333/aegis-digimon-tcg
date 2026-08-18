import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait, isPermanentKind } from "../../engine/cards/cardData.js";

/**
 * BT26-081 — Mervamon (BT26, Purple/Yellow/Black Lv.6 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-081` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] [Minervamon]: Cost 2
 *   [Digivolve] Lv.5 w/[TS] trait: Cost 4
 *   [Assembly -5] [Minervamon]
 *   [On Play] [When Digivolving] You may play up to 8 play cost's total worth of [Iliad]
 *     trait cards from your hand or trash without paying the costs. Then, to 1 of your
 *     opponent's Digimon, give -4000 DP until their turn ends for each of your [Iliad] or
 *     [TS] trait Digimon or Tamers.
 *   [All Turns] All of your [Iliad] trait Digimon gain ＜Alliance＞, ＜Reboot＞,
 *     ＜Blocker＞ and +2000 DP.
 *
 * Clause mapping:
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — "Play up to 8 play cost's total
 *     worth of [Iliad] trait cards ... without paying the costs": there is no
 *     "totalPlayCostBudget" primitive (the compiled IR for similarly-worded cards —
 *     EX7-047, EX8-029, BT8-106 — carries the SAME field name only as an unexecuted
 *     compiler placeholder; `rg -n "totalPlayCostBudget" apps/api/src/engine` has zero
 *     hits anywhere at runtime). Per card-module contract.3 this is one-off card logic, not a
 *     missing reusable primitive: modeled inline as a repeated "spend remaining budget"
 *     loop — each iteration offers the player any not-yet-played [Iliad] card from hand
 *     or trash whose OWN printed cost fits the remaining budget, using only the existing
 *     `ctx.ask.selectCards` / `ctx.fx.playInstances` primitives. Then "-4000 DP for each
 *     of your [Iliad] or [TS] trait Digimon or Tamers" is a scaling DP debuff on 1 chosen
 *     opponent Digimon (`ctx.fx.modifyDP`).
 *   EffectTiming.None — the "[All Turns]" static keyword+DP group-grant, re-derived every
 *     continuous pass over ALL of the controller's [Iliad] trait Digimon (BT5-085's
 *     `battleArea`-iteration group-grant shape, not a self-only grant).
 */
const cardId = "BT26-081";
const BUDGET = 8;

function hasIliadTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Iliad");
}

function hasIliadOrTsTrait(def: CardDefinition): boolean {
  return cardHasTrait(def, "Iliad") || cardHasTrait(def, "TS");
}

/** "Play up to 8 play cost's total worth of [Iliad] trait cards from hand/trash without paying costs." */
async function resolvePlayIliadBudget(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  let remaining = BUDGET;

  const poolOf = (): CardInstance[] =>
    [...owner.hand, ...owner.trash].filter((c) => {
      const def = ctx.game.definitionOf(c);
      return isPermanentKind(def) && hasIliadTrait(def) && def.playCost <= remaining;
    });

  for (;;) {
    const pool = poolOf();
    if (pool.length === 0) break;
    const willPlay = await ctx.ask.optional(ctx, `Play an [Iliad] trait card (${remaining} cost remaining)?`);
    if (!willPlay) break;
    const candidateIds = pool.map((c) => c.instanceId);
    const picked = await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: 1, max: 1 });
    if (picked.length === 0) break;
    const chosen = pool.find((c) => c.instanceId === picked[0]);
    if (chosen === undefined) break;
    const def = ctx.game.definitionOf(chosen);
    await ctx.fx.playInstances([chosen.instanceId], { payCost: false });
    remaining -= def.playCost;
    if (remaining <= 0) break;
  }
}

/** "-4000 DP for each of your [Iliad] or [TS] trait Digimon or Tamers." */
async function resolveDpDebuff(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const count = owner.battleArea.filter((p) => {
    if (p.inBreeding || p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return (isDigimon(def) || isTamer(def)) && hasIliadOrTsTrait(def);
  }).length;
  if (count === 0) return;

  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const candidates = ctx.game
    .player(opponent)
    .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1 ? candidates[0]! : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;
  ctx.fx.modifyDP(chosen, -4000 * count, EffectDuration.UntilOpponentTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const resolveMain = async (ctx: EffectContext): Promise<void> => {
      await resolvePlayIliadBudget(ctx, source);
      await resolveDpDebuff(ctx, source);
    };

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-budget-play-and-debuff`,
          description:
            "[On Play] [When Digivolving] You may play up to 8 play cost's total worth of " +
            "[Iliad] trait cards from your hand or trash without paying the costs. Then, to " +
            "1 of your opponent's Digimon, give -4000 DP until their turn ends for each of " +
            "your [Iliad] or [TS] trait Digimon or Tamers.",
          optional: false,
          resolve: resolveMain,
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-budget-play-and-debuff`,
          description:
            "[On Play] [When Digivolving] You may play up to 8 play cost's total worth of " +
            "[Iliad] trait cards from your hand or trash without paying the costs. Then, to " +
            "1 of your opponent's Digimon, give -4000 DP until their turn ends for each of " +
            "your [Iliad] or [TS] trait Digimon or Tamers.",
          optional: false,
          resolve: resolveMain,
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-iliad-group-grant`,
          description:
            "[All Turns] All of your [Iliad] trait Digimon gain ＜Alliance＞, ＜Reboot＞, " +
            "＜Blocker＞ and +2000 DP.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            for (const permanent of owner.battleArea) {
              if (permanent.inBreeding || permanent.topCard === undefined) continue;
              const def = ctx.game.definitionOf(permanent.topCard);
              if (!isDigimon(def) || !hasIliadTrait(def)) continue;
              ctx.fx.grantKeyword(permanent.permanentId, "Alliance", EffectDuration.UntilEachTurnEnd);
              ctx.fx.grantKeyword(permanent.permanentId, "Reboot", EffectDuration.UntilEachTurnEnd);
              ctx.fx.grantKeyword(permanent.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
              ctx.fx.modifyDP(permanent.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
