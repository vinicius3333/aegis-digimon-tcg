import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, onPlay, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT25-058 — Green Lv.6 Digimon (BT25, Callismon).
//
// ＜Reboot＞ ＜Blocker＞ ＜Fortitude＞
// Digivolve: 4 from Level 5 with [TS] trait
// [On Play] [Once Per Turn] [When Digivolving] [Once Per Turn] [When Attacking]
//   [Once Per Turn] You may suspend 1 of your opponent's Digimon or Tamers. Then, 1 of
//   their Digimon or Tamers can't unsuspend until their turn ends.
// [All Turns] [Once Per Turn] When effects play or digivolve any Digimon, <De-Digivolve 1>
//   1 of your opponent's Digimon. Then, this Digimon may battle 1 of your opponent's Digimon.

const cardId = "BT25-058";
const suspendRestrictEffectKey = `${cardId}/suspend-and-restrict`;

function oppDigimonOrTamer(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard == null) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) || def.kinds?.includes(CardKind.Tamer);
  });
}

function oppDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard == null) return false;
    return isDigimon(ctx.game.definitionOf(p.topCard));
  });
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
        staticModifier({
          source,
          effectKey: `${cardId}/fortitude`,
          description: "＜Fortitude＞",
          when: () => true,
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (perm) {
              ctx.fx.grantKeyword(perm.permanentId, "Fortitude", EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: suspendRestrictEffectKey,
          description:
            "[On Play] [Once Per Turn] You may suspend 1 of your opponent's Digimon or Tamers. " +
            "Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
          maxPerTurn: 1,
          optional: true,
          canActivate: (ctx) => oppDigimonOrTamer(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = oppDigimonOrTamer(ctx, source);
            if (targets.length === 0) return;

            const suspendChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 0,
              max: 1,
            });
            if (suspendChosen.length > 0) {
              await ctx.fx.suspend(suspendChosen);
            }

            const restrictChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (restrictChosen.length > 0) {
              ctx.fx.restrict(restrictChosen[0]!, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: suspendRestrictEffectKey,
          description:
            "[When Digivolving] [Once Per Turn] You may suspend 1 of your opponent's Digimon " +
            "or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
          maxPerTurn: 1,
          optional: true,
          canActivate: (ctx) => oppDigimonOrTamer(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = oppDigimonOrTamer(ctx, source);
            if (targets.length === 0) return;

            const suspendChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 0,
              max: 1,
            });
            if (suspendChosen.length > 0) {
              await ctx.fx.suspend(suspendChosen);
            }

            const restrictChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (restrictChosen.length > 0) {
              ctx.fx.restrict(restrictChosen[0]!, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: suspendRestrictEffectKey,
          description:
            "[When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon " +
            "or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.",
          maxPerTurn: 1,
          optional: true,
          canActivate: (ctx) => oppDigimonOrTamer(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = oppDigimonOrTamer(ctx, source);
            if (targets.length === 0) return;

            const suspendChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 0,
              max: 1,
            });
            if (suspendChosen.length > 0) {
              await ctx.fx.suspend(suspendChosen);
            }

            const restrictChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (restrictChosen.length > 0) {
              ctx.fx.restrict(restrictChosen[0]!, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-effect-entry-dedigivolve-battle`,
          description:
            "[All Turns] When an effect plays or digivolves any Digimon, De-Digivolve 1 an opponent's Digimon; then this Digimon may battle.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.trigger.enteredByEffect !== undefined,
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const deDigivolveTargets = oppDigimon(ctx, source);
            if (deDigivolveTargets.length > 0) {
              const chosen =
                deDigivolveTargets.length === 1
                  ? deDigivolveTargets[0]!.permanentId
                  : (
                      await ctx.ask.chooseTargets(ctx, {
                        candidates: deDigivolveTargets.map((p) => p.permanentId),
                        min: 1,
                        max: 1,
                      })
                    )[0];
              if (chosen !== undefined) ctx.fx.deDigivolve(chosen, 1, { byEffectSeat: ownerSeat });
            }

            const self = ctx.source.permanent();
            const battleTargets = oppDigimon(ctx, source);
            if (self === undefined || battleTargets.length === 0) return;
            if (!(await ctx.ask.optional(ctx, "Battle 1 of your opponent's Digimon?"))) return;
            const chosen =
              battleTargets.length === 1
                ? battleTargets[0]!.permanentId
                : (
                    await ctx.ask.chooseTargets(ctx, {
                      candidates: battleTargets.map((p) => p.permanentId),
                      min: 1,
                      max: 1,
                    })
                  )[0];
            if (chosen !== undefined) await ctx.fx.forceBattle?.(self.permanentId, chosen);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
