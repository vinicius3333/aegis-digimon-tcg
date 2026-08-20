import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { onDiscardSecurity, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT22-037 Chirinmon
//
// The catalog trigger `OnDiscardSecurity` is a real engine timing, but it is not an
// interpreter trigger. This card therefore uses the direct module contract so the
// effect cannot silently disappear when an effect trashes this card from security.
//
// Official text:
//   [When effects trash this card from the security stack] 1 of your opponent's
//   Digimon gets -8000 DP for the turn.
//   [When Digivolving] By trashing your top security card, this Digimon may digivolve
//   into a Digimon card with [Kentaurosmon] or [Mitamamon] in its name or the [CS]
//   trait in the hand with the digivolution cost reduced by 2.
//   [Inherited][When Attacking][Once Per Turn] 1 of your opponent's Digimon gets
//   -4000 DP for the turn.
const cardId = "BT22-037";

function opponentDigimon(ctx: EffectContext, source: CardSource) {
  return ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((permanent) => {
    return permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard));
  });
}

function eligibleDigivolution(ctx: EffectContext, card: CardInstance): boolean {
  const definition = ctx.game.definitionOf(card);
  if (!isDigimon(definition)) return false;
  return (
    definition.nameEn.includes("Kentaurosmon") ||
    definition.nameEn.includes("Mitamamon") ||
    (definition.types ?? []).includes("CS")
  );
}

async function chooseOpponentAndModify(ctx: EffectContext, source: CardSource, amount: number): Promise<void> {
  const candidates = opponentDigimon(ctx, source).map((permanent) => permanent.permanentId);
  if (candidates.length === 0) return;
  const selected = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (selected[0] !== undefined) ctx.fx.modifyDP(selected[0], amount, EffectDuration.UntilEachTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnDiscardSecurity) {
      return [
        onDiscardSecurity({
          source,
          effectKey: `${cardId}/discarded-from-security`,
          description:
            "[When effects trash this card from the security stack] 1 of your opponent's Digimon gets -8000 DP for the turn.",
          resolve: async (ctx) => chooseOpponentAndModify(ctx, source, -8000),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] By trashing your top security card, this Digimon may digivolve into a qualifying Digimon card in hand with the cost reduced by 2.",
          optional: true,
          resolve: async (ctx) => {
            const permanent = source.permanent();
            if (permanent === undefined) return;
            const hand = ctx.game.player(source.ownerSeat).hand.filter((card) => eligibleDigivolution(ctx, card));
            if (hand.length === 0 || ctx.game.player(source.ownerSeat).security.length === 0) return;

            const selected = await ctx.ask.selectCards(ctx, {
              candidates: hand.map((card) => card.instanceId),
              min: 0,
              max: 1,
            });
            const sourceInstanceId = selected[0];
            if (sourceInstanceId === undefined) return;

            await ctx.fx.trashFromSecurity(source.ownerSeat, 1, { fromTop: true });
            await ctx.fx.digivolveFromInstance(permanent.permanentId, sourceInstanceId, {
              // The effect selects by name/trait rather than by a printed evolution
              // requirement, so it ignores that requirement but still pays the
              // destination's printed evolution cost reduced by 2.
              payCost: true,
              costDelta: -2,
              ignoreRequirements: true,
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-when-attacking`,
          description: "[Inherited][When Attacking][Once Per Turn] An opponent's Digimon gets -4000 DP for the turn.",
          isInherited: true,
          maxPerTurn: 1,
          resolve: async (ctx) => chooseOpponentAndModify(ctx, source, -4000),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
