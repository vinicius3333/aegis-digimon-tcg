import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { linkCostOf } from "../../engine/effects/interpreter.js";
import { linkEligible } from "../../engine/effects/mindLink.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-007 — Swipemon (BT26, White Lv.2 DigiEgg).
 *
 * KB Q6962 confirms that the linked card must itself have the ＜Link＞ keyword.
 *
 * Printed text (this card has no own effect text — a DigiEgg's clause is inherited):
 *   (inherited) [When Attacking] [Once Per Turn] You may link 1 [Seven Code] trait
 *     Digimon card from your hand or this Digimon's digivolution cards to this Digimon
 *     with the cost reduced by 2.
 *
 * Clause mapping:
 *   EffectTiming.OnUseAttack (isInherited: true) — the whole card. The engine scopes
 *     OnUseAttack to the attacking permanent (GameEngine.fireTiming), so "this Digimon"
 *     is the source's own permanent; the link recipient is that same permanent.
 *     Candidates are drawn from the controller's hand and from the host's own
 *     digivolution cards (`permanent.stack`), filtered to ＜Link＞-eligible [Seven Code]
 *     Digimon cards — the same server-authoritative eligibility gate `runLink` applies
 *     (KB Q4881/Q6962), so a non-＜Link＞ card is never selectable.
 *     The cost is the printed link cost reduced by 2 and floored at 0 (`linkCostOf`),
 *     paid through the shared memory plumbing exactly as `runLink` does, before the
 *     `link` primitive plugs the card in.
 */
const cardId = "BT26-007";

const LINK_COST_REDUCTION = 2;

function isSevenCodeDigimon(def: CardDefinition): boolean {
  return isDigimon(def) && cardHasTrait(def, "Seven Code");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-when-attacking-link`,
          description:
            "[When Attacking] [Once Per Turn] You may link 1 [Seven Code] trait Digimon card " +
            "from your hand or this Digimon's digivolution cards to this Digimon with the cost " +
            "reduced by 2.",
          optional: true,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;

            const owner = ctx.game.player(source.ownerSeat);
            const pool: CardInstance[] = [...owner.hand, ...host.stack];
            const candidates = pool.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isSevenCodeDigimon(def) && linkEligible(def);
            });
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            const pickedId = chosen[0];
            if (pickedId === undefined) return;

            const picked = candidates.find((c) => c.instanceId === pickedId)!;
            const cost = linkCostOf(ctx.game.definitionOf(picked), -LINK_COST_REDUCTION);
            if (cost > 0) ctx.fx.gainMemory(-cost);
            await ctx.fx.link(host.permanentId, [pickedId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
