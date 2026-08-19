import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, onPlay, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT25-019 — Red Lv.6 Digimon (BT25, UltimateBrachiomon).
//
// ＜Reboot＞ ＜Blocker＞
// Digivolve: 4 from Level 5 with [TS] or [Dinosaur] trait
// [On Play] [When Digivolving] Delete 1 of your opponent's Digimon with the highest DP.
// [End of Your Turn] [Once Per Turn] If your opponent has 5 or more memory, their Digimon
//   effects don't affect this Digimon until their turn ends. Then, if they have 5 or less
//   memory, their Option effects don't affect this Digimon until their turn ends.

const cardId = "BT25-019";

function oppHighestDpDigimons(
  ctx: EffectContext,
  source: CardSource,
): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const digimons = Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
    return true;
  });
  if (digimons.length === 0) return [];
  const maxDp = Math.max(...digimons.map((p) => p.currentDP));
  return digimons.filter((p) => p.currentDP === maxDp);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/reboot`,
          description: "＜Reboot＞",
          when: () => true,
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (perm) {
              ctx.fx.grantKeyword(perm.permanentId, "Reboot", EffectDuration.Permanent);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          when: () => true,
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (perm) {
              ctx.fx.grantKeyword(perm.permanentId, "Blocker", EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "[On Play] Delete 1 of your opponent's Digimon with the highest DP.",
          canActivate: (ctx) => oppHighestDpDigimons(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = oppHighestDpDigimons(ctx, source);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen, "byEffect");
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description: "[When Digivolving] Delete 1 of your opponent's Digimon with the highest DP.",
          canActivate: (ctx) => oppHighestDpDigimons(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = oppHighestDpDigimons(ctx, source);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen, "byEffect");
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn`,
          description:
            "[End of Your Turn] [Once Per Turn] If your opponent has 5 or more memory, their " +
            "Digimon effects don't affect this Digimon until their turn ends. Then, if they " +
            "have 5 or less memory, their Option effects don't affect this Digimon until " +
            "their turn ends.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (perm === undefined) return;

            const m = ctx.game.state.memory;
            const oppMemory = source.ownerSeat === 0 ? -m : m;

            if (oppMemory >= 5) {
              ctx.fx.restrict(perm.permanentId, "beAffected", EffectDuration.UntilOpponentTurnEnd, { fromSourceKind: ["Digimon"] });
            }
            if (oppMemory <= 5) {
              ctx.fx.restrict(perm.permanentId, "beAffected", EffectDuration.UntilOpponentTurnEnd, { fromSourceKind: ["Option"] });
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
