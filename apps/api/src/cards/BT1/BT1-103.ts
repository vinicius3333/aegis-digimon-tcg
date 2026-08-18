import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT1-103 — Testament (BT1, Yellow Option).
 *
 *
 *   [Main] Until the end of your opponent's next turn, 1 of your Digimon gains ＜Blocker＞.
 *     GainBlocker(selectedPermanent, EffectDuration.UntilOpponentTurnEnd).
 *
 *   [Security] Trigger ＜Draw 1＞ (Draw 1 card from your deck.) Then, add this card to your hand.
 *     AddThisCardToHand(card) → ctx.fx.returnToHand([source.instanceId]).
 */

const cardId = "BT1-103";

function ownDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    if (p.topCard === undefined) continue;
    if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
    ids.push(p.permanentId);
  }
  return ids;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ----- [Main] grant Blocker to 1 own Digimon until end of opponent's next turn -----
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-gain-blocker`,
          description:
            "[Main] Until the end of your opponent's next turn, 1 of your Digimon gains ＜Blocker＞.",
          optional: false,
          canActivate: (ctx) => ownDigimonIds(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const candidates = ownDigimonIds(ctx, source);
            if (candidates.length === 0) return;
            const chosen =
              candidates.length === 1
                ? [candidates[0]!]
                : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            const permanentId = chosen[0];
            if (permanentId === undefined) return;
            ctx.fx.grantKeyword(permanentId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    // ----- [Security] draw 1, then add this card to hand --------------------------------
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-draw-return`,
          description:
            "[Security] Trigger ＜Draw 1＞ (Draw 1 card from your deck.) Then, add this card to your hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
