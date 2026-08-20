import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-062 — Ghostmon (BT26, Purple/Red Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-062 as of this port
// (`node tools/kb/query.mjs card BT26-062` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// [Digivolve] Lv.2 w/[NSo] trait: Cost 0 — a digivolution-cost requirement, not an effect
//   clause; already carried by CardDefinition.evoCosts, not implemented here.
// [Start of Your Main Phase] By trashing 1 card with the [Ghost] or [NSo] trait from your
//   hand, ＜Draw 1＞ and gain 1 memory.
//   "By ~ing, ..." is a declinable cost gating the draw+memory (BT26-057/BT26-098 idiom):
//   an optional-consent ask, then a hand-card pick filtered to the [Ghost]/[NSo] trait via
//   `CardDefinition.types` (BT4-098's `hasHybridTrait`-style membership check, applied to
//   this card's own printed traits), trashed with `ctx.fx.trash` (the general loose-card
//   trash primitive), then `ctx.fx.draw` + `ctx.fx.gainMemory`. Declining, or having no
//   eligible hand card, skips the whole clause (no partial payment).
//
// Inherited [Your Turn] This Digimon gets +2000 DP.
//   Continuous conditional DP static (BT1-005 precedent): on the battle area, on the
//   owner's turn, +2000 DP for the turn (`EffectDuration.UntilEachTurnEnd`, re-applied by
//   the continuous-effect recompute each time the condition holds).

const cardId = "BT26-062";
const dpBonus = 2000;

/** Hand cards with the [Ghost] or [NSo] trait, for the trash-cost pick. */
function ghostOrNsoHandCandidates(ctx: EffectContext, ownerSeat: Seat): string[] {
  const owner = ctx.game.player(ownerSeat);
  return owner.hand
    .filter((c) => {
      const types = ctx.game.definitionOf(c).types ?? [];
      return types.includes("Ghost") || types.includes("NSo");
    })
    .map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-draw-memory`,
          description:
            "[Start of Your Main Phase] By trashing 1 card with the [Ghost] or [NSo] " +
            "trait from your hand, ＜Draw 1＞ and gain 1 memory.",
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => ghostOrNsoHandCandidates(ctx, source.ownerSeat).length > 0,
          resolve: async (ctx) => {
            const candidates = ghostOrNsoHandCandidates(ctx, source.ownerSeat);
            if (candidates.length === 0) return;

            const wantToPay = await ctx.ask.optional(
              ctx,
              "Trash 1 [Ghost] or [NSo] trait card from your hand to draw 1 card and " +
                "gain 1 memory?",
            );
            if (!wantToPay) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.trash(chosen);
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-dp-plus-2000`,
          description: "[Your Turn] This Digimon gets +2000 DP.",
          isInherited: true,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.modifyDP(self.permanentId, dpBonus, EffectDuration.UntilEachTurnEnd);
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
