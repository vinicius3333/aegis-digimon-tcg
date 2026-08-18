import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// P-016 — Diaboromon (P, Black Lv.6 Digimon).
//
//     changeValue: () => count(),
//     isInheritedEffect: false,
//     card: card,
//     condition: Condition)
//   count() = card.Owner.GetBattleAreaPermanents()
//              .Count(p => p.TopCard.CardNames.Contains("Diaboromon"))
//   Condition = IsExistOnBattleArea(card) && IsOwnerTurn(card) && count() >= 1
//
// KB rulings (binding):
//   Q4127: [Diaboromon] tokens also count as 1 [Diaboromon] for this effect.
//   Q4128: this card itself counts as 1 [Diaboromon] for its own effect.
//
// The effect is a continuous static: during your turn, if you have at least 1 Diaboromon
// in your battle area, this Digimon gains <Security Attack +N> where N = the total count
// of [Diaboromon]-named Digimon in your battle area. Recorded via grantKeyword at each
// static evaluation (pattern from EX5-063.ts).
const cardId = "P-016";

function diaboromonCount(ctx: EffectContext, source: CardSource): number {
  const owner = ctx.game.player(source.ownerSeat);
  let count = 0;
  for (const permanent of owner.battleArea) {
    if (permanent.topCard === undefined) continue;
    const def = ctx.game.definitionOf(permanent.topCard);
    // CardNames.Contains("Diaboromon") — substring match on nameEn (Q4127: tokens count).
    if (isDigimon(def) && def.nameEn.includes("Diaboromon")) count++;
  }
  return count;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn] While you have at least 1 Digimon with [Diaboromon] in its name in your
    // battle area (including this card itself — KB Q4128), this Digimon gets
    // <Security Attack +N> where N = the count of [Diaboromon] Digimon in your battle area.
    //
    // Modeled as a staticModifier at None, gated on owner's turn and count >= 1
    // (mirrors EX5-063.ts: grantKeyword("SecurityAttack", UntilEachTurnEnd, amount)).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-attack-diaboromon-count`,
          description:
            "[Your Turn] For each Digimon with [Diaboromon] in its name in your battle area, " +
            "this Digimon gets ＜Security Attack +1＞.",
          optional: false,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            return diaboromonCount(ctx, source) >= 1;
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const count = diaboromonCount(ctx, source);
            if (count < 1) return;
            ctx.fx.grantKeyword(self.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, count);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
