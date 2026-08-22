import { EffectTiming, EffectDuration, isDigimon, isTamer, CardColor } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX4-068 — Brightness Wave (EX4, Yellow Option).
 *
 * Static: Ignore color requirements if you have a green Digimon/Tamer in play.
 * [Main] 1 opponent Digimon -6000 DP for the turn. For each color your Digimon have,
 *   activate it again. (Base 1 + distinct color count)
 * [Security] 1 opponent Digimon -12000 DP for the turn.
 */
const cardId = "EX4-068";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        {
          effectKey: `${cardId}/ignore-color`,
          description: "Ignore color requirements if you have a green Digimon or Tamer in play.",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: () => true,
          canActivate: (ctx) => {
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            return mine.some((p) => {
              if (p.inBreeding || p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (isDigimon(def) || isTamer(def)) && def.colors.includes(CardColor.Green);
            });
          },
          resolve: async (ctx) => {
            if (
              !ctx.game.player(source.ownerSeat).battleArea.some((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return (isDigimon(def) || isTamer(def)) && def.colors.includes(CardColor.Green);
              })
            )
              return;
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        },
      ];
    }

    // [Main] -6000 DP, repeated per distinct color.
    if (timing === EffectTiming.OnUseOption) {
      return [
        {
          effectKey: `${cardId}/main-effect`,
          description:
            "[Main] Activate the effect below. For each color your Digimon have, activate it again. - 1 of your opponent's Digimon gets -6000 DP for the turn.",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: () => true,
          canActivate: () => true,
          resolve: async (ctx) => {
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            const colors = new Set<CardColor>();
            for (const p of mine) {
              if (p.topCard === undefined) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (!isDigimon(def)) continue;
              const defColors = def.colors;
              for (const c of defColors) colors.add(c);
            }
            const count = 1 + colors.size;
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            for (let i = 0; i < count; i++) {
              const candidates = opp.battleArea
                .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                .map((p) => p.permanentId);
              if (candidates.length === 0) break;
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.modifyDP(chosen[0]!, -6000, EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        },
      ];
    }

    // [Security] -12000 DP to 1 opponent Digimon.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] 1 of your opponent's Digimon gets -12000 DP for the turn.",
          optional: false,
          resolve: async (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const candidates = opp.battleArea
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length > 0) {
              ctx.fx.modifyDP(chosen[0]!, -12000, EffectDuration.UntilEachTurnEnd);
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
