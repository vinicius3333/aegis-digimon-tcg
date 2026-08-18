import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT9-102 — Black Option (BT9, "Attack of the Heavy Mobile Digimon!").
//
// [Main] You may trash 1 card with [Cyborg] or [Machine] in its traits in your hand to
//   have all of your level 6 Digimon with [Machine] in their traits gain <Rush> and
//   "[On Play] If this Digimon has a digivolution card, <Blitz>" for the turn.
// [Security] You may trash 1 Digimon card with [Cyborg] or [Machine] in its traits in
//   your hand to delete 1 of your opponent's Digimon whose play cost is less than or
//   equal to the trashed card's play cost.

const cardId = "BT9-102";

function cyborgOrMachine(def: CardDefinition): boolean {
  const t = def.types ?? [];
  return t.includes("Cyborg") || t.includes("Machine");
}

function machineLv6Targets(
  ctx: EffectContext,
  source: CardSource,
): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.topCard == null) return false;
    const def = ctx.game.definitionOf(p.topCard);
    if (!isDigimon(def) || def.level !== 6) return false;
    return (def.types ?? []).includes("Machine");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] You may trash 1 card with [Cyborg] or [Machine] in its traits in your hand to have all of your level 6 Digimon with [Machine] in their traits gain <Rush> and '[On Play] If this Digimon has a digivolution card, <Blitz>' for the turn.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const trashCandidates = Array.from(owner.hand).filter((card) =>
              cyborgOrMachine(ctx.game.definitionOf(card)),
            );

            if (trashCandidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: trashCandidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });

            if (chosen.length === 0) return;

            await ctx.fx.trash(chosen);

            const targets = machineLv6Targets(ctx, source);
            for (const perm of targets) {
              ctx.fx.grantKeyword(perm.permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
              if (perm.stack.length >= 1) {
                ctx.fx.grantCustomEffect?.(perm.permanentId, source.ownerSeat, "OnPlayBlitzIfHasDigivolutionCard", EffectDuration.UntilEachTurnEnd);
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
          effectKey: `${cardId}/security`,
          description:
            "[Security] You may trash 1 Digimon card with [Cyborg] or [Machine] in its traits in your hand to delete 1 of your opponent's Digimon whose play cost is less than or equal to the trashed card's play cost.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const trashCandidates = Array.from(owner.hand).filter((card) => {
              const def = ctx.game.definitionOf(card);
              return isDigimon(def) && cyborgOrMachine(def);
            });

            if (trashCandidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: trashCandidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });

            if (chosen.length === 0) return;

            const trashedDef = ctx.game.definitionOf(
              trashCandidates.find((c) => c.instanceId === chosen[0]) ?? trashCandidates[0]!,
            );

            await ctx.fx.trash(chosen);

            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const deleteTargets = Array.from(opponent.battleArea).filter((p) => {
              if (p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
              return (ctx.game.definitionOf(p.topCard).playCost ?? 0) <= (trashedDef.playCost ?? 0);
            });

            if (deleteTargets.length > 0) {
              const dc = await ctx.ask.chooseTargets(ctx, {
                candidates: deleteTargets.map((p) => p.permanentId),
                min: 1,
                max: 1,
              });
              if (dc.length > 0) {
                await ctx.fx.deletePermanent(dc);
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
