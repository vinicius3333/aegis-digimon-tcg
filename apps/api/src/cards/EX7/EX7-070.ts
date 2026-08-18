import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX7-070";

function hasThreeMusketeers(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("Three Musketeers");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-delete-place-under`,
          description:
            "[Main] Delete 1 of your opponent's Digimon with the lowest play cost. Then, place " +
            "this card as the bottom digivolution card of 1 of your Digimon with the " +
            "[Three Musketeers] trait.",
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppDigimon = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
            if (oppDigimon.length > 0) {
              oppDigimon.sort((a, b) => {
                const defA = ctx.game.definitionOf(a.topCard!);
                const defB = ctx.game.definitionOf(b.topCard!);
                return (defA.playCost ?? 99) - (defB.playCost ?? 99);
              });
              const lowestCost = ctx.game.definitionOf(oppDigimon[0]!.topCard!).playCost ?? 99;
              const lowest = oppDigimon.filter((p) => (ctx.game.definitionOf(p.topCard!).playCost ?? 99) === lowestCost);
              const targets = await ctx.ask.chooseTargets(ctx, {
                candidates: lowest.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (targets.length > 0) {
                await ctx.fx.deletePermanent(targets);
              }
            }

            const threeMusk = Array.from(ctx.game.player(source.ownerSeat).battleArea)
              .filter((p) => p.topCard !== undefined && hasThreeMusketeers(ctx.game.definitionOf(p.topCard)));
            if (threeMusk.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: threeMusk.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.placeUnder(chosen[0]!, [source.instanceId]);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-delete`,
          description:
            "[Security] Delete 1 of your opponent's Digimon with the lowest play cost. Then, " +
            "trash this card.",
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppDigimon = Array.from(ctx.game.player(opponent).battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)));
            if (oppDigimon.length === 0) return;
            oppDigimon.sort((a, b) => {
              const defA = ctx.game.definitionOf(a.topCard!);
              const defB = ctx.game.definitionOf(b.topCard!);
              return (defA.playCost ?? 99) - (defB.playCost ?? 99);
            });
            const lowestCost = ctx.game.definitionOf(oppDigimon[0]!.topCard!).playCost ?? 99;
            const lowest = oppDigimon.filter((p) => (ctx.game.definitionOf(p.topCard!).playCost ?? 99) === lowestCost);
            const targets = await ctx.ask.chooseTargets(ctx, {
              candidates: lowest.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (targets.length > 0) {
              await ctx.fx.deletePermanent(targets);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/when-trashed-dedigivolve`,
          description:
            "When an effect trashes this digivolution card, ＜De-Digivolve 1＞ 1 of " +
            "your opponent's Digimon (minimum level 3).",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            // Migration note: printed text is "when an EFFECT trashes THIS DIGIVOLUTION CARD"
            // (cards.json effectText) — a self-specific reaction, not "trashed from your hand"
            // (the previous description was wrong) and not the generic host-anchored
            // whenDigivolutionTrashed. The correct live event is onDigivolutionCardDiscarded
            // (precedent: BT10-006), which carries trashedDigivolutionInstanceId for exactly
            // this "THIS specific card" gate — collapsed off the dead "whenEffectTrashes" name.
            ctx.fx.subscribeSubTrigger({
              event: "onDigivolutionCardDiscarded",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When this digivolution card trashed by effect, de-digivolve opponent.`,
              matches: (subCtx) => subCtx.trigger?.trashedDigivolutionInstanceId === source.instanceId,
              run: async (subCtx) => {
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                const oppDigimon = Array.from(subCtx.game.player(opponent).battleArea)
                  .filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)));
                if (oppDigimon.length === 0) return;
                const candidates = oppDigimon.map((p) => p.permanentId);
                const chosen = await subCtx.ask.chooseTargets(subCtx, {
                  candidates,
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  subCtx.fx.deDigivolve(chosen[0]!, 1, { stopAtLevel: 3 });
                }
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
