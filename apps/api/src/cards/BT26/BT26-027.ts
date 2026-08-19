import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-027 — Petermon (BT26, Yellow/Green Lv.4 Digimon, Fairy/WG).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-027 as of this port
// (`node tools/kb/query.mjs card BT26-027` returned no knowledge-base entries). Implemented
// from the printed card text only.
//
// [Digivolve] Lv.3 w/[WG] trait: Cost 2 — a digivolution-cost requirement, not an effect
//   clause; carried by CardDefinition.evoCosts in cards.json.
// [On Play] [Start of Opponent's Main Phase] By suspending 1 of your Digimon with the
//   [Vegetation], [Fairy] or [WG] trait, give 1 of your opponent's Digimon
//   ＜Security A. -2＞ until their turn ends.
//
// Two printed windows over one clause, so both entries share a single resolver (BT26-025's
// idiom). The [Start of Opponent's Main Phase] entry is the mirror of BT26-093's
// "[Start of Your Main Phase]" gate: OnStartMainPhase fires board-wide, so the card gates
// itself — `isOwnersTurn()` there, `!isOwnersTurn()` here.
//
// "By suspending ..." is a cost, so the effect is optional (the player may always decline to
// pay) and only an UNSUSPENDED trait Digimon of the controller's can pay it. ＜Security A. -2＞
// is granted with `grantKeyword(..., "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -2)`,
// the RB1-019/BT26-089/BT26-083 precedent for "＜Security A. -N＞ until their turn ends".

const cardId = "BT26-027";

const COST_TRAITS = ["Vegetation", "Fairy", "WG"] as const;

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

function hasCostTrait(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return COST_TRAITS.some((trait) => types.includes(trait));
}

/** Unsuspended [Vegetation]/[Fairy]/[WG] Digimon of the controller's — the ones able to pay. */
function costCandidates(ctx: EffectContext, source: CardSource): string[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea)
    .filter((permanent) => {
      if (permanent.inBreeding || permanent.isSuspended) return false;
      if (permanent.topCard === undefined) return false;
      const def = ctx.game.definitionOf(permanent.topCard);
      return isDigimon(def) && hasCostTrait(def);
    })
    .map((permanent) => permanent.permanentId);
}

function opponentDigimon(ctx: EffectContext, source: CardSource): string[] {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponentSeat).battleArea)
    .filter(
      (permanent) =>
        !permanent.inBreeding && permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    )
    .map((permanent) => permanent.permanentId);
}

/**
 * "By suspending 1 of your Digimon with the [Vegetation], [Fairy] or [WG] trait, give 1 of
 * your opponent's Digimon ＜Security A. -2＞ until their turn ends." — shared by the
 * [On Play] and [Start of Opponent's Main Phase] windows.
 */
async function suspendTraitDigimonAndWeakenSecurityAttack(ctx: EffectContext, source: CardSource): Promise<void> {
  const costTargets = costCandidates(ctx, source);
  if (costTargets.length === 0) return;

  const toSuspend = await ctx.ask.chooseTargets(ctx, { candidates: costTargets, min: 0, max: 1 });
  if (toSuspend.length === 0) return;

  await ctx.fx.suspend(toSuspend);

  const targets = opponentDigimon(ctx, source);
  if (targets.length === 0) return;

  const chosen =
    targets.length === 1 ? targets : await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
  if (chosen.length === 0) return;

  ctx.fx.grantKeyword(chosen[0]!, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -2);
}

const CLAUSE =
  "By suspending 1 of your Digimon with the [Vegetation], [Fairy] or [WG] trait, give 1 of " +
  "your opponent's Digimon ＜Security A. -2＞ until their turn ends.";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-weaken-security-attack`,
          description: `[On Play] ${CLAUSE}`,
          optional: true,
          canActivate: (ctx) => costCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await suspendTraitDigimonAndWeakenSecurityAttack(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/opponent-main-suspend-weaken-security-attack`,
          description: `[Start of Opponent's Main Phase] ${CLAUSE}`,
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && !ctx.source.isOwnersTurn(),
          canActivate: (ctx) => costCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            await suspendTraitDigimonAndWeakenSecurityAttack(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
