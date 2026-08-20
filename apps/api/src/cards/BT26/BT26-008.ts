import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-008 — Kotemon (BT26, Red Lv.3 Digimon).
//
// Catalog source: `packages/shared/src/cards/data/cards.json`. The local KB has no
// BT26-008 errata or Q&A, so each clause follows the committed printed text directly.
//
// [Digivolve] Lv.2 w/[Shambala]/[TS] trait: Cost 0 — structural generated alternate
//   evolution data, exposed by `digivolutionRequirementsFor`, not an effect clause.
// [When Moving] [On Play] 1 of your [Shambala] or [TS] trait Digimon gains
//   <Piercing> and +3000 DP for the turn.
// Inherited: [Your Turn] This Digimon gets +2000 DP.

const cardId = "BT26-008";

function hasShambalaOrTS(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Shambala" || t === "TS");
}

function shambalaOrTsTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (p) =>
      p.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(p.topCard)) &&
      hasShambalaOrTS(ctx.game.definitionOf(p.topCard)),
  );
}

/** Grant <Piercing> and +3000 DP for the turn to 1 chosen [Shambala]/[TS] Digimon. */
async function grantPierceAndDpForTheTurn(ctx: EffectContext, source: CardSource): Promise<void> {
  const targets = shambalaOrTsTargets(ctx, source);
  if (targets.length === 0) return;

  let chosenId: string;
  if (targets.length === 1) {
    chosenId = targets[0]!.permanentId;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: targets.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }

  ctx.fx.grantPierce(chosenId, EffectDuration.UntilEachTurnEnd);
  ctx.fx.modifyDP(chosenId, 3000, EffectDuration.UntilEachTurnEnd);
}

/** Whether this card is the permanent that just moved from breeding to battle. */
function isSelfMove(ctx: EffectContext, source: CardSource): boolean {
  const movedId = ctx.trigger?.movedPermanentId;
  if (movedId === undefined) return false;
  return movedId === source.permanent()?.permanentId;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] 1 of your [Shambala] or [TS] trait Digimon gains <Piercing> and
    // +3000 DP for the turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-pierce-dp`,
          description:
            "[On Play] 1 of your [Shambala] or [TS] trait Digimon gains <Piercing> and " + "+3000 DP for the turn.",
          optional: false,
          resolve: async (ctx) => {
            await grantPierceAndDpForTheTurn(ctx, source);
          },
        }),
      ];
    }

    // [When Moving] Same clause, fired when this Digimon itself moves from the
    // breeding area to the battle area (§15-16-16-1; engine's OnMove window).
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving-pierce-dp`,
          description:
            "[When Moving] 1 of your [Shambala] or [TS] trait Digimon gains <Piercing> and " + "+3000 DP for the turn.",
          optional: false,
          when: (ctx) => isSelfMove(ctx, source),
          resolve: async (ctx) => {
            await grantPierceAndDpForTheTurn(ctx, source);
          },
        }),
      ];
    }

    // Inherited: [Your Turn] This Digimon gets +2000 DP.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-dp-boost`,
          description: "[Your Turn] This Digimon gets +2000 DP.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            ctx.fx.modifyDP(host.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
