import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { compiledEffects } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * EX4-073 — Omnimon Merciful Mode (EX4, Black Lv.7 Digimon).
 *
 * Digivolution requirement: 2 from Omnimon Lv.7 (handled by engine).
 * [When Digivolving] <De-Digivolve 3> 1 opponent Digimon. Then, budget delete:
 *   choose any number of opponent Digimon with total play cost ≤6 (min 1).
 * [When Attacking] Optional: trash up to 3 Lv.6+ cards from digivolution cards.
 *   For each trashed, delete 1 opponent Digimon/Tamer with lowest play cost.
 *   If exactly 3 trashed, trash top 2 of opponent's security.
 */
const cardId = "EX4-073";

const compiled = {
  ...compiledEffects[cardId]!,
  effects: [
    {
      trigger: "WhenDigivolving" as const,
      actions: [
        {
          kind: "DeDigivolve" as const,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 3,
        },
        {
          kind: "DeleteBudget" as const,
          filter: { controller: "opponent", kind: ["Digimon"] },
          budget: 6,
          upTo: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking" as const,
      isInherited: true,
      optional: true,
      actions: [
        {
          kind: "TrashDigivolution" as const,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 3,
          choose: true,
          optional: true,
          trackCount: "ex4-073-trashed",
        },
        {
          kind: "RepeatPerCount" as const,
          countSource: "ex4-073-trashed",
          action: {
            kind: "Delete" as const,
            target: {
              filter: { controller: "opponent", kind: ["Digimon", "Tamer"], superlative: "lowestPlayCost" },
              count: 1,
            },
          },
        },
        {
          kind: "SecurityManipulation" as const,
          op: "trashTop" as const,
          controller: "opponent" as const,
          amount: 2,
          condition: { kind: "namedCountAtLeast" as const, countSource: "ex4-073-trashed", count: 3 },
        },
      ],
    },
  ],
  coverage: "full" as const,
  residual: [],
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] De-Digivolve 3 + budget delete.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] <De-Digivolve 3> 1 of your opponent's Digimon. Then, choose any number of your opponent's Digimon so that their play cost total is up to 6 and delete them.",
          optional: false,
          resolve: async (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));

            const deDigiTargets = opp.battleArea
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (deDigiTargets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: deDigiTargets, min: 1, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.deDigivolve(chosen[0]!, 3);
              }
            }

            const eligible = opp.battleArea.filter((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              if (!isDigimon(def) && !isTamer(def)) return false;
              const cost = def.playCost;
              return cost !== undefined && cost <= 6;
            });
            if (eligible.length > 0) {
              const deleted: string[] = [];
              const remaining = eligible.map((p) => ({
                id: p.permanentId,
                cost: ctx.game.definitionOf(p.topCard!).playCost ?? 0,
              }));
              const avail = remaining.filter((r) => r.cost <= 6);
              while (avail.length > 0) {
                const currentTotal = deleted.reduce((sum, id) => {
                  const perm = ctx.game.permanentById(id);
                  if (!perm || perm.topCard === undefined) return sum;
                  return sum + (ctx.game.definitionOf(perm.topCard).playCost ?? 0);
                }, 0);
                const pickable = avail.filter((r) => currentTotal + r.cost <= 6);
                if (pickable.length === 0) break;
                const pick = await ctx.ask.selectCards(ctx, {
                  candidates: pickable.map((a) => a.id),
                  min: deleted.length === 0 ? 1 : 0,
                  max: 1,
                });
                if (pick.length === 0) break;
                deleted.push(pick[0]!);
              }
              if (deleted.length > 0) {
                await ctx.fx.deletePermanent(deleted, "byEffect");
              }
            }
          },
        }),
      ];
    }

    // [When Attacking] Trash digivolution cards → sequential lowest-cost delete + security trash.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-trash`,
          description:
            "[When Attacking] By trashing up to 3 level 6 or higher cards in this Digimon's digivolution cards, among your opponent's Digimon and Tamers, delete 1 with the lowest play cost for each card trashed. If you trashed 3 cards, trash the top 2 cards of your opponent's security stack.",
          optional: true,
          canActivate: (ctx) => {
            const self = source.permanent();
            if (!self) return false;
            return self.stack.some((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && (def.level ?? 0) >= 6;
            });
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            const stack = self.stack;
            const lv6Cands = stack
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isDigimon(def) && (def.level ?? 0) >= 6;
              })
              .map((c) => c.instanceId);
            if (lv6Cands.length === 0) return;

            const maxTrash = Math.min(3, lv6Cands.length);
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: lv6Cands,
              min: 1,
              max: maxTrash,
            });
            if (chosen.length === 0) return;

            await ctx.fx.trashDigivolutionCards(self.permanentId, chosen, {
              byEffectSeat: source.ownerSeat,
            });

            const trashCount = chosen.length;
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));

            for (let i = 0; i < trashCount; i++) {
              const targets = opp.battleArea
                .filter((p) => {
                  if (p.topCard === undefined) return false;
                  const def = ctx.game.definitionOf(p.topCard);
                  return isDigimon(def) || isTamer(def);
                })
                .map((p) => ({
                  id: p.permanentId,
                  cost: ctx.game.definitionOf(p.topCard!).playCost ?? 999,
                }));

              if (targets.length === 0) break;
              const minCost = Math.min(...targets.map((t) => t.cost));
              const lowest = targets.filter((t) => t.cost === minCost).map((t) => t.id);
              if (lowest.length > 0) {
                const pick = await ctx.ask.chooseTargets(ctx, { candidates: lowest, min: 1, max: 1 });
                if (pick.length > 0) {
                  await ctx.fx.deletePermanent(pick, "byEffect");
                }
              }
            }

            if (trashCount === 3) {
              await ctx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 2, { fromTop: true });
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerIrCard(cardId, compiled);
export default module;
