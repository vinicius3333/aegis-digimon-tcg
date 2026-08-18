import { CardKind,  EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
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

function oppDigimonOrTamer(
  ctx: EffectContext,
  source: CardSource,
): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard == null) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) || def.kinds?.includes(CardKind.Tamer);
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
          effectKey: `${cardId}/on-play`,
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
          effectKey: `${cardId}/when-digivolving`,
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
          effectKey: `${cardId}/when-attacking`,
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

    // BLOCKED: [All Turns] When effects play/digivolve → De-Digivolve 1 + may battle.
    // Requires OnEnterFieldAnyone SubTrigger with IsByEffect gate.

    return [];
  },
};

registerCard(module);
export default module;
