import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-010 — Roleplaymon (BT26, Red Lv.3 Digimon).
 *
 * KB Q6964 confirms that a link-effect Piercing clause is unavailable after Detach has
 * removed this linked card before the battle deletion resolves.
 *
 * Printed text:
 *   [Digivolve] Lv.2 w/[Appmon] trait: Cost 0
 *   ＜Detach ([Seven Code] trait)＞
 *   [When Attacking] By trashing 1 [Game], [Open] or [Seven Code] trait card from your
 *     hand, ＜Draw 2＞
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause; carried by
 *     CardDefinition.evoCosts in cards.json.
 *   ＜Detach＞ — printed keyword on this card's own text, resolved by the engine's
 *     printed-keyword reader (engine/combat/keywords.ts); no module clause.
 *   EffectTiming.OnUseAttack — "By trashing 1 [Game], [Open] or [Seven Code] trait card
 *     from your hand, ＜Draw 2＞". "By trashing" is a COST: the draw happens only if the
 *     controller actually pays it, so the hand pick is a 0-or-1 selection (declining, or
 *     holding no payable card, resolves to nothing). Modeled on EX12-059's
 *     "By placing ... cards from your hand" cost shape.
 *
 * RESIDUAL — link face: this card also carries a printed `linkEffect`:
 *     ＜Progress＞ ＜Piercing＞
 *   No BT26 card in this set ports its `linkEffect` (BT26-028 / BT26-037 leave theirs
 *   unported too) and the clause-coverage gate does not read that field, so it is left
 *   unimplemented here for consistency rather than half-modeled. Track it with the
 *   set-wide link-face gap.
 */
const cardId = "BT26-010";

const COST_TRAITS = ["Game", "Open", "Seven Code"] as const;

function isPayableCostCard(def: CardDefinition): boolean {
  return COST_TRAITS.some((trait) => cardHasTrait(def, trait));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-trash-draw`,
          description:
            "[When Attacking] By trashing 1 [Game], [Open] or [Seven Code] trait card from " + "your hand, ＜Draw 2＞",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.hand
              .filter((c) => isPayableCostCard(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const paid = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (paid.length === 0) return;

            await ctx.fx.trash(paid);
            await ctx.fx.draw(source.ownerSeat, 2);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
