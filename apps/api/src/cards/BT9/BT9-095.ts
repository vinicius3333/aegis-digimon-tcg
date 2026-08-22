import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, handResidentStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT9-095 — Red Option (BT9, [X Antibody] red support).
//
// While you have a Digimon with [X Antibody] in its digivolution cards in play,
//   you may use this card for a play cost of 2.
// [Main] Delete 1 of your opponent's Digimon with 13000 DP or less. Then, 1 of your
//   Digimon with [Greymon] in its name may attack your opponent.
// [Security] Delete 1 of your opponent's Digimon.
//
// KB:
//   The play-cost reduction is a static cost change gated on having a battle-area Digimon
//   with "X Antibody" in its digivolution card names. The Greymon-name attack is optional
//   returns false — i.e. can't attack opponent's Digimon, only the player).

const cardId = "BT9-095";

function _ownerBattleAreaDigimons(source: CardSource): Permanent[] {
  const _owner = source.ownerSeat;
  return []; // resolved inside resolve using ctx.game
}

function hasXAntibodyInStack(
  ctx: EffectContext,
  source: CardSource,
): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const permanent of owner.battleArea) {
    if (permanent.topCard == null) continue;
    const def = ctx.game.definitionOf(permanent.topCard);
    if (!isDigimon(def)) continue;
    for (const stackCard of permanent.stack) {
      if (ctx.game.definitionOf(stackCard).nameEn === "X Antibody") return true;
    }
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        handResidentStatic({
          source,
          effectKey: `${cardId}/play-cost-reduction`,
          description: "While you have a Digimon with [X Antibody] in its digivolution cards in play, you may use this card for a play cost of 2.",
          when: (ctx) => hasXAntibodyInStack(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.changePlayCost(
              (facts) => facts.def.nameEn === ctx.source.definition.nameEn && facts.controllerSeat === ctx.source.ownerSeat,
              -2,
              { setFixed: false },
            );
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-delete-attack`,
          description:
            "[Main] Delete 1 of your opponent's Digimon with 13000 DP or less. Then, 1 of your Digimon with [Greymon] in its name may attack your opponent.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));

            const deleteTargets = Array.from(opponent.battleArea).filter((p) => {
              if (p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
              return p.currentDP <= 13000;
            });

            if (deleteTargets.length > 0) {
              const candidates = deleteTargets.map((p) => p.permanentId);
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent(chosen);
              }
            }

            const greymonAttackers = Array.from(owner.battleArea).filter((p) => {
              if (p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return def.nameEn.includes("Greymon") && !p.isSuspended;
            });

            if (greymonAttackers.length > 0) {
              const candidates = greymonAttackers.map((p) => p.permanentId);
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 0, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.forceAttack(chosen[0]!);
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
          description: "[Security] Delete 1 of your opponent's Digimon.",
          resolve: async (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const targets = Array.from(opponent.battleArea).filter((p) => {
              return p.topCard != null && isDigimon(ctx.game.definitionOf(p.topCard));
            });
            if (targets.length > 0) {
              const candidates = targets.map((p) => p.permanentId);
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent(chosen);
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
