import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-085 — Eosmon (BT6, White Lv.5 Digimon).
 *
 * [When Attacking] You may play 1 level 5 or lower [Eosmon] from your hand
 * without paying its memory cost.
 *
 * [Your Turn] (inherited) This Digimon gets +1000 DP.
 *
 * Residual: "include up to 50 copies of cards with this card's card number in
 * your deck" is a deckbuilding rule, not in-engine.
 */
const cardId = "BT6-085";

function isEosmonLv5OrLower(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  if (def.level === undefined || def.level > 5) return false;
  return def.nameEn.includes("Eosmon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    if (timing === EffectTiming.OnAllyAttack) {
      out.push(
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-play-eosmon`,
          description:
            "[When Attacking] You may play 1 level 5 or lower [Eosmon] from your hand without paying its memory cost.",
          optional: true,
          canActivate: (ctx) => {
            return ctx.game
              .player(source.ownerSeat)
              .hand.some((c) => isEosmonLv5OrLower(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .hand.filter((c) => isEosmonLv5OrLower(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;
            const selected = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
            if (selected.length > 0) {
              await ctx.fx.playInstances(selected, { payCost: false });
            }
          },
        }),
      );
    }

    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-dp-boost`,
          description: "[Your Turn] This Digimon gets +1000 DP.",
          isInherited: true,
          when: (_ctx) => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const perm = source.permanent();
            if (!perm) return;
            ctx.fx.modifyDP(perm.permanentId, 1000, EffectDuration.Permanent);
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
