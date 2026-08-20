import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-009 — Hyokomon (BT26, Red Lv.3 Digimon, Bird/Iliad/TS).
//
// Audited against committed ruling Q6963, whose complete-text definition includes names,
// traits, effect boxes and mechanic requirements. The [Start of Your Main Phase] "by trashing ... from
// your hand, ＜Draw 1＞ and gain 1 memory" clause mirrors the identical shape found on
// BT25-091's optional-cost-then-effect pattern and BT25-101's "trash from hand as a cost"
// selectCards(min:0, max:1) idiom, wired through the turnTiming/OnStartMainPhase builder
// used by ST24-13 / BT24-102. The inherited [When Attacking] clause mirrors ST16-05's
// whenAttacking self-attacker gate (ctx.trigger.attackerPermanentId === self.permanentId)
// and ST22-14's hand-size-gated selectCards-then-move idiom.
//
// The "[Digivolve] Lv.2 w/[TS] trait: Cost 0" header is handled centrally by
// ALTERNATE_DIGIVOLUTION_OVERRIDES and is not implemented here.
//
// [Start of Your Main Phase] By trashing 1 card with [Chronomon] in its text or the
//   [Shaman] trait from your hand, ＜Draw 1＞ and gain 1 memory.
// [When Attacking] (inherited) ＜Draw 1＞ Then, if your hand has 6 or more cards, return
//   1 card in your hand to the bottom of the deck.

const cardId = "BT26-009";

function isChronomonOrShamanCard(def: CardDefinition): boolean {
  return (
    matchNameOrTrait(def, { tokens: ["Chronomon"], match: "text" }) ||
    [def.inheritedEffectText, def.securityEffectText, def.linkEffect, def.optionEffect].some((text) =>
      text?.toLowerCase().includes("chronomon"),
    ) ||
    matchNameOrTrait(def, { tokens: ["Shaman"], match: "trait" })
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] By trashing 1 card with [Chronomon] in its text or the
    // [Shaman] trait from your hand, <Draw 1> and gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-draw`,
          description:
            "[Start of Your Main Phase] By trashing 1 card with [Chronomon] in its text or " +
            "the [Shaman] trait from your hand, ＜Draw 1＞ and gain 1 memory.",
          optional: false,
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.hand).filter((c) => isChronomonOrShamanCard(ctx.game.definitionOf(c)));
            if (candidates.length === 0) return;

            // "By trashing" is the cost: declining (selecting 0) pays no cost and grants
            // no draw/memory (same idiom as BT25-101's trash-from-hand cost gate).
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            const paid = await ctx.fx.trash(chosen);
            if (!paid.some((card) => card.instanceId === chosen[0])) return;
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [When Attacking] (inherited) <Draw 1>. Then, if your hand has 6 or more cards,
    // return 1 card in your hand to the bottom of the deck.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-draw-then-bottom`,
          description:
            "[When Attacking] ＜Draw 1＞ Then, if your hand has 6 or more cards, return 1 " +
            "card in your hand to the bottom of the deck.",
          isInherited: true,
          optional: false,
          when: (ctx) => {
            const self = source.permanent();
            return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId;
          },
          canActivate: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);

            const owner = ctx.game.player(source.ownerSeat);
            if (owner.hand.length < 6) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: Array.from(owner.hand).map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.returnToDeck(chosen, { toTop: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
