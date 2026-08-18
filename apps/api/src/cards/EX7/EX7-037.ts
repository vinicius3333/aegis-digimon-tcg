import { EffectDuration, EffectTiming, canAssignDistinctColors, filterToDistinctColors, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX7-037";

function hasNSp(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("NSp");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-play-nsp`,
          description:
            "[When Digivolving] You may play 1 Digimon card with the [NSp] trait and a play " +
            "cost of 7 or less from your hand without paying the cost. If DNA digivolving, you " +
            "may play 2 Digimon cards with different colors and the [NSp] trait and a play cost " +
            "of 7 or less from your hand without paying the cost instead.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const qualifying = Array.from(owner.hand).filter((c) => {
              const def = ctx.game.definitionOf(c);
              if (!hasNSp(def)) return false;
              return (def.playCost ?? 99) <= 7;
            });
            if (qualifying.length === 0) return;

            const yes = await ctx.ask.optional(
              ctx,
              "Play 1 [NSp] Digimon with play cost 7 or less from your hand without paying?",
            );
            if (!yes) return;

            const colorsOf = (instanceId: string) =>
              ctx.game.definitionOf(qualifying.find((c) => c.instanceId === instanceId)!).colors ?? [];

            // Only DNA digivolving unlocks the 2-card mode, and only when some pair can
            // actually satisfy "with different colors" (CR 4-24-2: each card needs one
            // color no other pick uses, so two red/blue cards are a legal pair).
            const isDna = ctx.trigger?.isDnaDigivolve ?? false;
            const pairExists = qualifying.some((a, i) =>
              qualifying.some((b, j) => j > i && canAssignDistinctColors([colorsOf(a.instanceId), colorsOf(b.instanceId)])),
            );
            const differentColors = isDna && pairExists;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: qualifying.map((c) => c.instanceId),
              min: 0,
              max: differentColors ? 2 : 1,
              differentColors,
            });
            // The prompt is a hint; the server still enforces the constraint on what came back.
            const legal = differentColors ? filterToDistinctColors(chosen, colorsOf) : chosen.slice(0, 1);
            if (legal.length > 0) {
              await ctx.fx.playInstances(legal, { payCost: false });
            }
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-dp-reduction`,
          description:
            "[When Digivolving] [Once Per Turn] For each of your Digimon, 1 of your opponent's " +
            "Digimon gets -7000 DP for the turn.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppDigimon = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
            if (oppDigimon.length === 0) return;
            const candidates = oppDigimon.map((p) => p.permanentId);
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length > 0) {
              ctx.fx.modifyDP(chosen[0]!, -7000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-dp-reduction`,
          description:
            "[When Attacking] [Once Per Turn] For each of your Digimon, 1 of your opponent's " +
            "Digimon gets -7000 DP for the turn.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppDigimon = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
            if (oppDigimon.length === 0) return;
            const candidates = oppDigimon.map((p) => p.permanentId);
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length > 0) {
              ctx.fx.modifyDP(chosen[0]!, -7000, EffectDuration.UntilEachTurnEnd);
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
