import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-013 — Musyamon (BT26, Red/Purple Lv.4 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-013 as of this port
// (`node tools/kb/query.mjs card BT26-013` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// [Digivolve] Lv.3 w/[Shambala]/[TS] trait: Cost 2 — a digivolution-cost requirement,
//   not an effect clause; already carried centrally by ALTERNATE_DIGIVOLUTION_OVERRIDES,
//   so it needs no entry here.
// ＜Blocker＞ — printed keyword, parsed automatically from effectText by the engine's
//   combat/keywords.ts (PRINTED_MATCHERS); needs no explicit grant (same as BT24-056).
// [On Play] [On Deletion] By trashing 1 card in your hand, delete 1 of your opponent's
//   Digimon with 6000 DP or less.
// Inherited: [Your Turn] This Digimon gets +2000 DP.

const cardId = "BT26-013";

/**
 * "By trashing 1 card in your hand" — an optional cost (min:0 lets the controller
 * decline). Only on a successful trash does the delete resolve, gated to opponent
 * Digimon at 6000 DP or less. Shared by the [On Play] and [On Deletion] clauses.
 */
async function resolveTrashToDelete(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const handIds = Array.from(owner.hand).map((c) => c.instanceId);
  if (handIds.length === 0) return;

  const toTrash = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 0, max: 1 });
  if (toTrash.length === 0) return;
  await ctx.fx.trash(toTrash);

  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const candidates = opponent.battleArea
    .filter(
      (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && p.currentDP <= 6000,
    )
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;
  await ctx.fx.deletePermanent(chosen, "byEffect");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] By trashing 1 card in your hand, delete 1 of your opponent's Digimon
    // with 6000 DP or less.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-to-delete`,
          description:
            "[On Play] By trashing 1 card in your hand, delete 1 of your opponent's Digimon with 6000 DP or less.",
          optional: false,
          resolve: async (ctx) => {
            await resolveTrashToDelete(ctx, source);
          },
        }),
      ];
    }

    // [On Deletion] Same clause.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-trash-to-delete`,
          description:
            "[On Deletion] By trashing 1 card in your hand, delete 1 of your opponent's Digimon with 6000 DP or less.",
          optional: false,
          resolve: async (ctx) => {
            await resolveTrashToDelete(ctx, source);
          },
        }),
      ];
    }

    // Inherited: [Your Turn] This Digimon gets +2000 DP.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-dp-boost`,
          description: "[Your Turn] This Digimon gets +2000 DP.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
