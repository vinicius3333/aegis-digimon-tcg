import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-012 — Manekimon (BT26, Red/Yellow Lv.4 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-012 as of this port
// (`node tools/kb/query.mjs card BT26-012` returned no knowledge-base entries). implemented
// from the printed card text only; the [Main] clause mirrors the analogous EX12-013/
// EX12-027 "[Main] [Once Per Turn] play or use 1 <trait> card from your hand with the
// cost reduced by 2" shape (EX12-013/027 are themselves hand-written), timed the same
// way as EX5-062's on-field "[Main] [Once Per Turn]" activated ability
// (EffectTiming.OnDeclaration + the `activated` builder).
//
// [Digivolve] Lv.3 w/[Shambala] trait: Cost 2 — a digivolution-cost requirement, not an
//   effect clause; already carried by CardDefinition.evoCosts in cards.json and read
//   directly by the engine's digivolution logic, so it needs no entry here.
// [Main] [Once Per Turn] You may play or use 1 [TB] trait card from your hand with the
//   cost reduced by 2.
// Inherited: [When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP
//   for the turn.
//
// The "use" branch below only performs the mechanical half of using an Option
// (pay the reduced cost, trash it, fire whenOptionUsed) via `ctx.fx.useOptionFromHand`;
// it does not itself resolve the used Option's own printed effect. Actually running an
// arbitrary card's own effect body from within another card's module would mean
// re-deriving the engine's compiled-effect dispatch (interpreter.ts's
// `runUseOptionWithoutCost`, which is not exposed as a `ctx.fx.*` primitive) inside this
// file — exactly what card-module contract forbids. This mirrors the same, already
// reviewed simplification used by EX4-030, BT10-041 and ST22-07 for structurally
// identical "use an Option from hand" clauses.

const cardId = "BT26-012";
const TB_TRAIT = "TB";

function hasTbTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(TB_TRAIT);
}

function tbTraitHandCards(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.hand).filter((c) => hasTbTrait(ctx.game.definitionOf(c)));
}

function opponentDigimonPermanentIds(ctx: EffectContext, source: CardSource): string[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return opponent.battleArea
    .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] [Once Per Turn] You may play or use 1 [TB] trait card from your hand with
    // the cost reduced by 2.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-play-or-use-tb`,
          description:
            "[Main] [Once Per Turn] You may play or use 1 [TB] trait card from your hand " +
            "with the cost reduced by 2.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => tbTraitHandCards(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = tbTraitHandCards(ctx, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            const chosenCard = candidates.find((c) => c.instanceId === chosen[0]!);
            if (chosenCard === undefined) return;
            const def = ctx.game.definitionOf(chosenCard);

            if (def.kinds.includes(CardKind.Option)) {
              const reducedCost = Math.max(0, (def.playCost ?? 0) - 2);
              if (reducedCost > 0) ctx.fx.gainMemory(-reducedCost);
              await ctx.fx.useOptionFromHand(ctx, chosenCard.instanceId, def.playCost);
            } else {
              await ctx.fx.playInstances([chosenCard.instanceId], { payCost: true, costDelta: 2 });
            }
          },
        }),
      ];
    }

    // Inherited: [When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets
    // -2000 DP for the turn.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-dp-minus-2000`,
          description:
            "[When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP " +
            "for the turn.",
          isInherited: true,
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => opponentDigimonPermanentIds(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = opponentDigimonPermanentIds(ctx, source);
            if (targets.length === 0) return;

            let chosenId: string;
            if (targets.length === 1) {
              chosenId = targets[0]!;
            } else {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: targets,
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              chosenId = chosen[0]!;
            }

            ctx.fx.modifyDP(chosenId, -2000, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
