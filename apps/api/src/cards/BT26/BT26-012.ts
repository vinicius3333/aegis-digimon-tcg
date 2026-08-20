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
// Audited against the three committed rulings Q6966-Q6968. The [Main] clause mirrors
// the analogous EX12-013/
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
// `ctx.fx.useOptionFromHand` resolves the chosen Option's registered OnUseOption body before
// its normal post-resolution move. Paid Option use and paid Digimon play both route through
// the central cost/restriction seams, so cost-reduction locks suppress the -2 (Q6967) and
// effect-play prohibitions stop the play before moving the selected card (Q6968).

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
              await ctx.fx.useOptionFromHand(ctx, chosenCard.instanceId, def.playCost, {
                payCost: true,
                costDelta: 2,
              });
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
          description: "[When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP " + "for the turn.",
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
