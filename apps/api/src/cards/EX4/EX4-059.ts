import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX4-059 — Jijimon (EX4, Purple Lv.6 Digimon).
 *
 * Digivolution requirement: 3 from level 5 Green multicolor (handled by engine).
 * [When Attacking] <Alliance>: optionally suspend 1 of your other Digimon →
 *   this Digimon adds its DP and gains <Piercing> for the attack.
 * [When Digivolving] Until opponent's turn end, this Digimon and 1 of your
 *   level 5 or lower Digimon gain "[On Deletion] You may play this card
 *   without paying the cost."
 */
const cardId = "EX4-059";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Attacking] Alliance: suspend 1 other, add DP + pierce.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        {
          effectKey: `${cardId}/alliance`,
          description:
            "[When Attacking] By suspending 1 of your other Digimon, this Digimon adds the suspended Digimon's DP and gains <Piercing> for the attack.",
          optional: true,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const self = source.permanent();
            if (!self) return false;
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            return mine.some(
              (p) =>
                p.topCard !== undefined &&
                isDigimon(ctx.game.definitionOf(p.topCard)) &&
                !p.isSuspended &&
                p.permanentId !== self.permanentId,
            );
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            const otherDigi = mine
              .filter(
                (p) =>
                  p.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(p.topCard)) &&
                  !p.isSuspended &&
                  p.permanentId !== self.permanentId,
              )
              .map((p) => p.permanentId);
            if (otherDigi.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: otherDigi, min: 1, max: 1 });
            if (chosen.length === 0) return;
            const allyId = chosen[0]!;
            const ally = ctx.game.permanentById(allyId);
            if (!ally) return;
            await ctx.fx.suspend([allyId]);
            ctx.fx.modifyDP(self.permanentId, ally.currentDP, EffectDuration.UntilEndAttack);
            ctx.fx.grantKeyword(self.permanentId, "Piercing", EffectDuration.UntilEndAttack);
          },
        },
      ];
    }

    // [When Digivolving] Grant [On Deletion] play without cost to self + 1 Lv.≤5.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/grant-on-deletion`,
          description:
            "[When Digivolving] Until the end of your opponent's turn, this Digimon and 1 of your level 5 or lower Digimon gain \"[On Deletion] You may play this card without paying the cost.\"",
          optional: false,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.grantCustomEffect?.(self.permanentId, source.ownerSeat, "OnDeletionPlaySelf", EffectDuration.UntilOpponentTurnEnd);

            const mine = ctx.game.player(source.ownerSeat).battleArea;
            const candidates = mine
              .filter((p) => {
                if (p.topCard === undefined) return false;
                if (p.permanentId === self.permanentId) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def)) return false;
                return (def.level ?? 99) <= 5;
              })
              .map((p) => p.permanentId);
            if (candidates.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.grantCustomEffect?.(chosen[0]!, source.ownerSeat, "OnDeletionPlaySelf", EffectDuration.UntilOpponentTurnEnd);
              }
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
