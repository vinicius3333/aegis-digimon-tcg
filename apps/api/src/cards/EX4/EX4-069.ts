import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security } from "../../engine/effects/builders.js";
import { compiledEffects } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * EX4-069 — Gaia Reactor (EX4, Black Option).
 *
 * [Main] Choose 1 of each player's Digimon with the highest play cost. Delete all other Digimon.
 * [Security] Activate [Main] effect.
 */
const cardId = "EX4-069";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    if (timing === EffectTiming.OnUseOption) {
      out.push({
        effectKey: `${cardId}/main`,
        description: "[Main] Choose 1 of each player's Digimon with the highest play cost. Delete all other Digimon.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: () => true,
        canActivate: () => true,
        resolve: async (ctx) => {
          const saved: string[] = [];
          const ownerSeat = source.ownerSeat;
          const oppSeat = ctx.game.opponentOf(ownerSeat);

          for (const seat of [ownerSeat, oppSeat]) {
            const player = ctx.game.player(seat);
            const digs = player.battleArea.filter(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
            if (digs.length === 0) continue;
            let maxCost = -1;
            for (const p of digs) {
              if (p.topCard === undefined) continue;
              if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
              const c = ctx.game.definitionOf(p.topCard).playCost ?? 0;
              if (c > maxCost) maxCost = c;
            }
            const highest = digs.filter((p) => {
              const cost = ctx.game.definitionOf(p.topCard!).playCost ?? 0;
              return cost === maxCost;
            });
            if (highest.length === 0) continue;
            if (highest.length === 1) {
              saved.push(highest[0]!.permanentId);
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: highest.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) saved.push(chosen[0]!);
            }
          }

          const toDelete: string[] = [];
          for (const seat of [ownerSeat, oppSeat]) {
            const player = ctx.game.player(seat);
            for (const p of player.battleArea) {
              if (p.topCard === undefined) continue;
              if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
              if (saved.includes(p.permanentId)) continue;
              toDelete.push(p.permanentId);
            }
          }
          if (toDelete.length > 0) {
            await ctx.fx.deletePermanent(toDelete, "byEffect");
          }
        },
      });
    }

    // [Security] Activate [Main].
    if (timing === EffectTiming.SecuritySkill) {
      out.push({
        ...security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate [Main] effect.",
          optional: false,
          resolve: async (ctx) => {
            const main = module.effectsForTiming(EffectTiming.OnUseOption, source)[0];
            if (main !== undefined) await main.resolve(ctx);
          },
        }),
        isSecurity: true,
      });
    }

    return out;
  },
};

registerIrCard(cardId, compiledEffects[cardId]!, module);
export default module;
