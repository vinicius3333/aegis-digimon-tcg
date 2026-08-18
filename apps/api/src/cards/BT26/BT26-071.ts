import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-071 — Flarerizamon (BT26, Purple/Red Lv.4 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-071 as of this port
// (`node tools/kb/query.mjs card BT26-071` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// Printed text:
//   [Digivolve] Lv.3 w/[NSo] trait: Cost 2 — a digivolution-cost requirement, not an
//     effect clause; already carried by CardDefinition.evoCosts, not implemented here.
//   [On Play] [When Digivolving] By deleting 1 of your Digimon, delete 1 of your
//     opponent's level 4 or lower Digimon.
//   Inherited: ＜Raid＞ — printed keyword, parsed automatically for combat legality from
//     effectText by the engine's combat/keywords.ts (PRINTED_MATCHERS); needs no
//     explicit grant here (same treatment as BT26-013's ＜Blocker＞ and BT26-055's
//     ＜Fragment＞ note — ＜Raid＞ itself has no separate ledger-gated behavior to grant,
//     unlike ＜Fragment＞).
//
// Clause mapping:
//   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared body via
//   resolveDeleteOwnToDeleteOpponent; no "Once Per Turn" is printed, so each timing
//   gets its own effectKey — mirrors BT26-023's per-timing-key convention rather than
//   BT26-016/BT26-055's shared-budget one).
//     "By deleting 1 of your Digimon, delete 1 of your opponent's level 4 or lower
//     Digimon." — a mandatory cost/effect pair: no "you may" softens it, but paying an
//     additional cost is always the controller's choice (same idiom as BT26-013's
//     trash-cost and BT26-023's place-under-cost clauses), so declining the delete
//     (choosing 0 own targets via `chooseTargets(min:0,max:1)`) pays nothing and grants
//     no effect. "1 of your Digimon" is unrestricted — the source itself is a legal
//     target of its own cost, same reading as BT26-055's own-Digimon delete. The
//     opponent-side "level 4 or lower" filter mirrors BT26-023's
//     `opponentLevel4OrLowerDigimonIds` helper verbatim.

const cardId = "BT26-071";

/** Battle-area Digimon permanents (not in breeding) controlled by `seat`. */
function battleAreaDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).filter(
    (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

/** Opponent battle-area Digimon at level 4 or lower. */
function opponentLevel4OrLowerDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return opponent.battleArea
    .filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) && (def.level ?? 0) <= 4;
    })
    .map((p) => p.permanentId);
}

/**
 * "By deleting 1 of your Digimon, delete 1 of your opponent's level 4 or lower
 * Digimon." Shared by the [On Play] and [When Digivolving] clauses. Declining the cost
 * (selecting 0 own targets) pays nothing and grants no effect.
 */
async function resolveDeleteOwnToDeleteOpponent(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentTargets = opponentLevel4OrLowerDigimonIds(ctx, source);
  if (opponentTargets.length === 0) return;

  const ownCandidates = battleAreaDigimon(ctx, source).map((p) => p.permanentId);
  if (ownCandidates.length === 0) return;

  const ownChosen = await ctx.ask.chooseTargets(ctx, { candidates: ownCandidates, min: 0, max: 1 });
  if (ownChosen.length === 0) return;
  await ctx.fx.deletePermanent(ownChosen);

  let opponentChosenId: string;
  if (opponentTargets.length === 1) {
    opponentChosenId = opponentTargets[0]!;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, { candidates: opponentTargets, min: 1, max: 1 });
    if (chosen.length === 0) return;
    opponentChosenId = chosen[0]!;
  }

  await ctx.fx.deletePermanent([opponentChosenId]);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-delete-own-to-delete-opponent`,
          description:
            "[On Play] By deleting 1 of your Digimon, delete 1 of your opponent's " +
            "level 4 or lower Digimon.",
          optional: false,
          canActivate: (ctx) =>
            opponentLevel4OrLowerDigimonIds(ctx, source).length > 0 &&
            battleAreaDigimon(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveDeleteOwnToDeleteOpponent(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete-own-to-delete-opponent`,
          description:
            "[When Digivolving] By deleting 1 of your Digimon, delete 1 of your " +
            "opponent's level 4 or lower Digimon.",
          optional: false,
          canActivate: (ctx) =>
            opponentLevel4OrLowerDigimonIds(ctx, source).length > 0 &&
            battleAreaDigimon(ctx, source).length > 0,
          resolve: async (ctx) => {
            await resolveDeleteOwnToDeleteOpponent(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
