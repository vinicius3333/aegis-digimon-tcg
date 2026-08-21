import { EffectTiming } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// P-021 A New World — hand-written EffectModule.
//
//
//   EffectTiming.OptionSkill ([Main]):
//     If you have [Mimi Tachikawa] in play, you may play a [Palmon] from your hand
//     without paying its memory cost. If you played one, return 1 of your [Mimi Tachikawa]
//     cards to its owner's hand.
//     CanSelectPermanentCondition: permanent on owner's battle area AND
//       exact card name [Mimi Tachikawa].
//     CanSelectCardCondition: CanPlayAsNewPermanent(payCost:false, root:Hand) AND
//       exact card name [Palmon].
//     After play: if played, select 1 Mimi Tachikawa and Mode.Bounce (return to hand).
//
//   EffectTiming.SecuritySkill ([Security]): Add this card to its owner's hand.
//
// KB rulings (binding):
//   Q4130: if you have a [Mimi Tachikawa] in play, you CAN use this effect to play
//     a [Palmon] from your hand without paying its memory cost.
//
const cardId = "P-021";

const isMimiTachikawa = (name: string): boolean => name === "Mimi Tachikawa";

function mimiTachikawaOnField(ctx: EffectContext, source: CardSource): Permanent[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).filter((perm) => {
    if (perm.topCard === undefined) return false;
    const def = ctx.game.definitionOf(perm.topCard);
    return isMimiTachikawa(def.nameEn);
  });
}

function palmonInHand(ctx: EffectContext, source: CardSource): string[] {
  return Array.from(ctx.game.player(source.ownerSeat).hand)
    .filter((card) => ctx.game.definitionOf(card).nameEn === "Palmon")
    .map((card) => card.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-play-palmon-bounce-mimi`,
          description:
            "[Main] If you have [Mimi Tachikawa] in play, you may play a [Palmon] from your " +
            "hand without paying its memory cost to return 1 of your [Mimi Tachikawa] cards " +
            "to its owner's hand.",
          optional: false,
          canActivate: (ctx) => mimiTachikawaOnField(ctx, source).length > 0,
          resolve: async (ctx) => {
            const mimis = mimiTachikawaOnField(ctx, source);
            if (mimis.length === 0) return;

            const palmons = palmonInHand(ctx, source);
            if (palmons.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: palmons,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            const played = await ctx.fx.playInstances(chosen, { payCost: false });
            if (played.length === 0) return;

            // After a successful Palmon play, bounce 1 Mimi Tachikawa to hand.
            const mimiPerms = mimiTachikawaOnField(ctx, source);
            if (mimiPerms.length === 0) return;
            const mimiTargets = await ctx.ask.chooseTargets(ctx, {
              candidates: mimiPerms.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            for (const permId of mimiTargets) {
              const perm = ctx.game.permanentById(permId);
              if (perm?.topCard !== undefined) {
                await ctx.fx.returnToHand([perm.topCard.instanceId]);
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
          effectKey: `${cardId}/security-add-to-hand`,
          description: "[Security] Add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
