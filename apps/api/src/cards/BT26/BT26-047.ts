import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-047 — TyrantKabuterimon (BT26, Green Lv.6 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-047` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.5 w/[Insectoid]/[TS] trait: Cost 3
 *   [Assembly -6] 4 [Larva]/[Insectoid]/[Titan] trait Digimon cards w/different levels
 *   [On Play] [When Digivolving] This Digimon may battle 1 of your opponent's Digimon.
 *   [Start of Your Main Phase] [On Play] [When Digivolving] By suspending 1 Digimon,
 *     until your opponent's turn ends, none of your suspended [Insectoid] or [Titan]
 *     trait Digimon are affected by your opponent's Option effects, and they get +3000 DP.
 *
 * Clause mapping:
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving — BOTH abilities on these two
 *     timings: "This Digimon may battle 1 of your opponent's Digimon" (`ctx.fx.forceBattle`,
 *     the direct §14 battle primitive — no attack declaration/block/security) and the
 *     suspend-cost buff below.
 *   EffectTiming.OnStartMainPhase — only the suspend-cost buff.
 *   Suspend-cost buff: "By suspending 1 Digimon, until your opponent's turn ends, none of
 *     your suspended [Insectoid] or [Titan] trait Digimon are affected by your opponent's
 *     Option effects, and they get +3000 DP." Read literally as an instant snapshot: pay
 *     the cost (suspend 1 of your Digimon, chosen by the controller), then apply the
 *     immunity (`ctx.fx.restrict(..., "beAffected", ..., { fromSourceKind: ["Option"] })`,
 *     EX9-021 precedent) and the +3000 DP to whichever of your Digimon are ALREADY
 *     suspended and carry the [Insectoid]/[Titan] trait at that moment (including the one
 *     just suspended as the cost) — not a continuously re-derived group grant, since the
 *     printed text reads as a one-time "get +3000 DP" rather than a persistent "while
 *     suspended" static.
 */
const cardId = "BT26-047";

function hasInsectoidOrTitan(def: CardDefinition): boolean {
  return cardHasTrait(def, "Insectoid") || cardHasTrait(def, "Titan");
}

function ownDigimonPermanentIds(ctx: EffectContext, source: CardSource): string[] {
  return ctx.game
    .player(source.ownerSeat)
    .battleArea.filter((p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
}

/** "This Digimon may battle 1 of your opponent's Digimon." */
async function resolveMayBattle(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = ctx.source.permanent();
  if (self === undefined) return;
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const candidates = ctx.game
    .player(opponent)
    .battleArea.filter((p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const willBattle = await ctx.ask.optional(ctx, "Battle 1 of your opponent's Digimon?");
  if (!willBattle) return;

  const chosen =
    candidates.length === 1 ? candidates[0]! : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;
  await ctx.fx.forceBattle?.(self.permanentId, chosen);
}

/**
 * "By suspending 1 Digimon, until your opponent's turn ends, none of your suspended
 * [Insectoid] or [Titan] trait Digimon are affected by your opponent's Option effects,
 * and they get +3000 DP."
 */
async function resolveSuspendBuff(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = ownDigimonPermanentIds(ctx, source).filter((id) => {
    const perm = ctx.game.permanentById(id);
    return perm !== undefined && !perm.isSuspended;
  });
  if (candidates.length === 0) return;

  const willPay = await ctx.ask.optional(ctx, "Suspend 1 of your Digimon for this effect?");
  if (!willPay) return;

  const chosen =
    candidates.length === 1 ? candidates[0]! : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (chosen === undefined) return;
  await ctx.fx.suspend([chosen]);

  for (const permanentId of ownDigimonPermanentIds(ctx, source)) {
    const perm = ctx.game.permanentById(permanentId);
    if (perm === undefined || !perm.isSuspended || perm.topCard === undefined) continue;
    if (!hasInsectoidOrTitan(ctx.game.definitionOf(perm.topCard))) continue;
    ctx.fx.restrict(permanentId, "beAffected", EffectDuration.UntilOpponentTurnEnd, { fromSourceKind: ["Option"] });
    ctx.fx.modifyDP(permanentId, 3000, EffectDuration.UntilOpponentTurnEnd);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-may-battle`,
          description: "[On Play] [When Digivolving] This Digimon may battle 1 of your opponent's Digimon.",
          optional: false,
          resolve: async (ctx) => resolveMayBattle(ctx, source),
        }),
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-buff`,
          description:
            "[Start of Your Main Phase] [On Play] [When Digivolving] By suspending 1 Digimon, " +
            "until your opponent's turn ends, none of your suspended [Insectoid] or [Titan] " +
            "trait Digimon are affected by your opponent's Option effects, and they get " +
            "+3000 DP.",
          optional: false,
          resolve: async (ctx) => resolveSuspendBuff(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-may-battle`,
          description: "[On Play] [When Digivolving] This Digimon may battle 1 of your opponent's Digimon.",
          optional: false,
          resolve: async (ctx) => resolveMayBattle(ctx, source),
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-buff`,
          description:
            "[Start of Your Main Phase] [On Play] [When Digivolving] By suspending 1 Digimon, " +
            "until your opponent's turn ends, none of your suspended [Insectoid] or [Titan] " +
            "trait Digimon are affected by your opponent's Option effects, and they get " +
            "+3000 DP.",
          optional: false,
          resolve: async (ctx) => resolveSuspendBuff(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-suspend-buff`,
          description:
            "[Start of Your Main Phase] [On Play] [When Digivolving] By suspending 1 Digimon, " +
            "until your opponent's turn ends, none of your suspended [Insectoid] or [Titan] " +
            "trait Digimon are affected by your opponent's Option effects, and they get " +
            "+3000 DP.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => resolveSuspendBuff(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
