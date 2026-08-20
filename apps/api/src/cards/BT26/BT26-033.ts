import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { cardHasTrait, permanentHasTrait } from "../../engine/cards/cardData.js";
import {
  activated,
  colorWaiverStatic,
  handResidentStatic,
  staticModifier,
  whenDigivolving,
} from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-033 — Jupitermon // Wide Plasment (BT26 Yellow/Red DUAL Digimon/Option).
//
// The committed KB contains Q7004-Q7006 (2026-08-18), confirming stacked cost reductions,
// simultaneous leave prevention for all matching cards, and the always-active use-cost surcharge.
//
// [Digivolve] Lv.5 w/[TS] trait: Cost 4 — a digivolution-cost requirement, not an effect
//   clause; already carried by CardDefinition.evoCosts / ALTERNATE_DIGIVOLUTION_OVERRIDES,
//   not implemented here.
// ＜Raid＞ / ＜Alliance＞ / ＜Engage＞ — printed keywords, parsed automatically from
//   effectText by the engine's combat/keywords.ts (PRINTED_MATCHERS) for combat legality;
//   still granted explicitly below (mirrors BT26-011's ＜Raid＞ staticModifier) so the
//   continuous ledger (hasKeyword) reflects them for other cards that read keywords.
// [When Digivolving] Add your top security card to the hand. Then, if it's your turn,
//   you may play or use 1 [Iliad] card from your hand with the cost reduced by 5.
// [All Turns] When any of your [TS] trait Digimon or Tamers would leave the battle area,
//   by placing this Digimon's top stacked card as the bottom security card, they don't
//   leave.
//
// Option side [Wide Plasment]:
// For each of your security cards, add 1 to this card's use cost — a live per-recompute
//   surcharge (mirrors BT25-096's own live-state use-cost modifier), keyed to this exact
//   card (by cardId) rather than by name, since a use-cost surcharge tied to "this card"
//   should not spill onto other printings of the same card sharing a name.
// ＜Use Req. ([TS] trait)＞ — while the controller has a [TS] card in the battle area,
//   the Option side may be used without satisfying its printed yellow/red color gate.
// [Main] Delete all of your opponent's Digimon with the lowest DP. Then, ＜Recovery +1＞.
//   No "if you did" ties the two together, so ＜Recovery +1＞ is attempted regardless of
//   whether any Digimon was deleted (mirrors BT26-016's identically unconditional
//   "Then, ... ＜Recovery +1＞" reading).
//
// The "play or use 1 [Iliad] card ... with the cost reduced by 5" branch mirrors
// BT26-012's "play or use 1 [TB] trait card ... with the cost reduced by 2" shape: the
// Option branch only performs the mechanical half of using an Option (pay the reduced
// cost, trash it, fire whenOptionUsed) via `ctx.fx.useOptionFromHand`; it does not itself
// resolve the used Option's own printed effect body, since doing so would mean
// re-deriving the interpreter's compiled-effect dispatch inside this file — exactly what
// card-module contract forbids.
//
// The [All Turns] leave-prevention clause mirrors BT26-016's `wouldLeavePlay` "prevent"
// replacement (itself keyed off EX7-014/BT9-012's preventCheck idiom), broadened here to
// (a) protect ANY of the controller's [TS] trait Digimon/Tamers rather than only the host
// itself, and (b) pay the cost from the HOST's (this Jupitermon's) own digivolution stack
// rather than the leaving permanent's. "This Digimon's top stacked card" reads as the
// card immediately under this permanent's top card (stack is ordered bottom (index 0) ->
// top (last), per BT26-031's stack-scan comment); `ctx.fx.addSecurity` accepts that loose
// stacked instanceId directly (its `collectForReturn` splices a non-top stack card without
// touching the host permanent itself). No "[Once Per Turn]" is printed on this clause
// (unlike BT26-016's), so it is left unbounded, gated only by this Digimon actually having
// a stacked card to pay with.

const cardId = "BT26-033";
const TS_TRAIT = "TS";
const ILIAD_TRAIT = "Iliad";

function hasTrait(def: CardDefinition, trait: string): boolean {
  return cardHasTrait(def, trait);
}

function iliadHandCards(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.hand).filter((c) => hasTrait(ctx.game.definitionOf(c), ILIAD_TRAIT));
}

function ownerHasTsCardInPlay(ctx: EffectContext, source: CardSource): boolean {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).some((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    return permanentHasTrait(ctx.game, permanent, TS_TRAIT);
  });
}

/** Opponent battle-area Digimon permanents (not in breeding), for the [Main] delete clause. */
function opponentDigimonTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea).filter(
    (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-security-then-iliad`,
          description:
            "[When Digivolving] Add your top security card to the hand. Then, if it's your " +
            "turn, you may play or use 1 [Iliad] card from your hand with the cost reduced " +
            "by 5.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.securityToHand(source.ownerSeat, 1, { fromTop: true });

            if (!source.isOwnersTurn()) return;

            const candidates = iliadHandCards(ctx, source);
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
                costDelta: 5,
              });
            } else {
              await ctx.fx.playInstances([chosenCard.instanceId], { payCost: true, costDelta: 5 });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        // Printed ＜Raid＞ / ＜Alliance＞ / ＜Engage＞ keywords.
        staticModifier({
          source,
          effectKey: `${cardId}/keywords`,
          description: "＜Raid＞ ＜Alliance＞ ＜Engage＞",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            ctx.fx.grantKeyword(me.permanentId, "Raid", EffectDuration.Permanent);
            ctx.fx.grantKeyword(me.permanentId, "Alliance", EffectDuration.Permanent);
            ctx.fx.grantKeyword(me.permanentId, "Engage", EffectDuration.Permanent);
          },
        }),
        // [All Turns] When any of your [TS] trait Digimon or Tamers would leave the
        // battle area, by placing this Digimon's top stacked card as the bottom security
        // card, they don't leave.
        staticModifier({
          source,
          effectKey: `${cardId}/prevent-leave-ts-place-stack-as-security`,
          description:
            "[All Turns] When any of your [TS] trait Digimon or Tamers would leave the " +
            "battle area, by placing this Digimon's top stacked card as the bottom " +
            "security card, they don't leave.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const selfId = self.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: selfId,
              mode: "prevent",
              affectsAll: true,
              description:
                "[All Turns] By placing this Digimon's top stacked card as the bottom " +
                "security card, a [TS] trait Digimon or Tamer doesn't leave the battle area.",
              protects: (subCtx, leavingPermanentId) => {
                const leaving = subCtx.game.permanentById(leavingPermanentId);
                if (leaving === undefined || leaving.inBreeding || leaving.topCard === undefined) return false;
                if (leaving.controllerSeat !== source.ownerSeat) return false;
                return hasTrait(subCtx.game.definitionOf(leaving.topCard), TS_TRAIT);
              },
              preventCheck: async (subCtx) => {
                const host = subCtx.game.permanentById(selfId);
                if (host === undefined || host.stack.length === 0) return false;

                const wantToPay = await subCtx.ask.optional(
                  subCtx,
                  "Place this Digimon's top stacked card as your bottom security card to " +
                    "keep it from leaving the battle area?",
                );
                if (!wantToPay) return false;

                const topStacked = host.stack[host.stack.length - 1]!;
                await subCtx.fx.addSecurity(source.ownerSeat, [topStacked.instanceId], { toTop: false });
                const refreshedHost = subCtx.game.permanentById(selfId);
                const paid = refreshedHost?.stack.every((card) => card.instanceId !== topStacked.instanceId) ?? false;
                return (
                  paid &&
                  subCtx.game
                    .player(source.ownerSeat)
                    .security.some((card) => card.instanceId === topStacked.instanceId)
                );
              },
            });
          },
        }),
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-ts`,
          description: "＜Use Req. ([TS] trait)＞ Ignore this card's color requirements.",
          when: (ctx) => ownerHasTsCardInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
        // Use-cost surcharge for the Option side: +1 per security card the controller has.
        handResidentStatic({
          source,
          effectKey: `${cardId}/use-cost-plus-security-count`,
          description: "For each of your security cards, add 1 to this card's use cost.",
          optional: false,
          resolve: async (ctx) => {
            const securityCount = ctx.game.player(source.ownerSeat).security.length;
            if (securityCount === 0) return;
            ctx.fx.changePlayCost(
              (facts) => facts.def.cardId === cardId && facts.controllerSeat === source.ownerSeat,
              securityCount,
            );
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Delete all of your opponent's Digimon with the lowest DP. Then, " + "＜Recovery +1＞.",
          resolve: async (ctx) => {
            const targets = opponentDigimonTargets(ctx, source);
            if (targets.length > 0) {
              const lowestDp = Math.min(...targets.map((p) => p.currentDP));
              const toDelete = targets.filter((p) => p.currentDP === lowestDp).map((p) => p.permanentId);
              await ctx.fx.deletePermanent(toDelete);
            }
            await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
