import { EffectDuration, EffectTiming, isDigimon, isOption, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

/**
 * BT26-032 — Ceresmon (BT26, Yellow/Green Lv.6 Digimon).
 *
 * The committed KB contains Q7000-Q7003 (2026-08-18), covering deferred DP-zero rule
 * checks, either player's Digimon paying the suspend cost, cumulative play-cost
 * reductions, and independently choosing the Option face's unsuspend-lock targets.
 *
 * Printed text:
 *   [Digivolve] Play cost 12 [Ceresmon]: Cost 2
 *   ＜Alliance＞ ＜Succession ([Ceresmon])＞
 *   [When Digivolving] All of your opponent's suspended Digimon get -5000 DP until their
 *     turn ends. Then, by suspending 1 Digimon, if it's your turn, you may play or use 1
 *     [Vegetation] or [TS] trait card from your hand with the cost reduced by 5.
 *   [Rule] Trait: Has [Vegetation] Type.
 *
 * This is a DUAL card (kinds: Digimon + Option, `dualEffect: "Famis"`); its Option face
 * carries its own printed text:
 *   ＜Use Req. ([TS] trait)＞
 *   [Main] You may suspend 2 of your opponent's Digimon or Tamers. Then, 3 of their
 *     Digimon or Tamers can't unsuspend until their turn ends.
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause.
 *   ＜Alliance＞ — printed keyword on this card's own text, resolved by the engine's
 *     printed-keyword reader (engine/combat/keywords.ts).
 *   ＜Succession ([Ceresmon])＞ — confer all non-Succession effects of the topmost
 *     face-up [Ceresmon] digivolution card via `conferStackEffects`, matching BT26-103.
 *   EffectTiming.WhenDigivolving — the DP penalty on ALL opponent suspended Digimon,
 *     then the optional suspend-cost half. "by suspending 1 Digimon" is a COST, so the
 *     play/use only happens when the controller actually suspends one; "if it's your
 *     turn" additionally gates the play/use half only (the DP penalty is unconditional).
 *     "play or use" splits on card kind as the interpreter does: an Option is USED
 *     (its [Main] effect runs), anything else is PLAYED.
 *   EffectTiming.None — [Rule] Trait: Has [Vegetation] Type, a permanent self trait
 *     grant via `grantNameTrait`.
 *   EffectTiming.OnUseOption — the Option face's [Main] effect (the dual-card branch
 *     convention used by BT26-033). Both halves are optional-in-effect: "you may suspend
 *     2" is a choice, and the unsuspend lock lands on up to 3 of the opponent's Digimon
 *     or Tamers via the engine's `unsuspend` restriction.
 *   ＜Use Req. ([TS] trait)＞ on the Option face — an in-hand color waiver while the
 *     controller has a [TS] card in the battle area.
 */
const cardId = "BT26-032";

const DP_PENALTY = -5000;
const COST_REDUCTION = 5;
const PLAYABLE_TRAITS = ["Vegetation", "TS"] as const;

function hasPlayableTrait(def: CardDefinition): boolean {
  return PLAYABLE_TRAITS.some((trait) => cardHasTrait(def, trait));
}

function ownerHasTsCardInPlay(ctx: EffectContext, source: CardSource): boolean {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).some((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    const effectiveTraits = ctx.game.effectiveTraits?.(permanent.permanentId);
    if (effectiveTraits !== undefined) {
      return effectiveTraits.some((trait) => trait.toLowerCase() === "ts");
    }
    return cardHasTrait(ctx.game.definitionOf(permanent.topCard), "TS");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-penalty-and-play`,
          description:
            "[When Digivolving] All of your opponent's suspended Digimon get -5000 DP until " +
            "their turn ends. Then, by suspending 1 Digimon, if it's your turn, you may play " +
            "or use 1 [Vegetation] or [TS] trait card from your hand with the cost reduced by 5.",
          optional: false,
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            for (const p of ctx.game.player(opponentSeat).battleArea) {
              if (p.inBreeding || p.topCard === undefined) continue;
              if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
              if (!p.isSuspended) continue;
              ctx.fx.modifyDP(p.permanentId, DP_PENALTY, EffectDuration.UntilOpponentTurnEnd);
            }

            // "if it's your turn" gates only the second half.
            if (!ctx.source.isOwnersTurn()) return;

            const owner = ctx.game.player(source.ownerSeat);
            const playable = owner.hand.filter((c) => hasPlayableTrait(ctx.game.definitionOf(c)));
            if (playable.length === 0) return;

            // "by suspending 1 Digimon" — the cost. Any unsuspended Digimon may pay it;
            // declining leaves the whole second half unresolved (Q7001).
            const suspendable = [
              ...Array.from(owner.battleArea),
              ...Array.from(ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea),
            ]
              .filter(
                (p) =>
                  !p.inBreeding &&
                  !p.isSuspended &&
                  p.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(p.topCard)),
              )
              .map((p) => p.permanentId);
            if (suspendable.length === 0) return;

            const toSuspend = await ctx.ask.chooseTargets(ctx, {
              candidates: suspendable,
              min: 0,
              max: 1,
            });
            if (toSuspend.length === 0) return;
            const paid = await ctx.fx.suspend([toSuspend[0]!]);
            if (!paid.includes(toSuspend[0]!)) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: playable.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            const pickedId = chosen[0];
            if (pickedId === undefined) return;

            const picked = playable.find((c) => c.instanceId === pickedId)!;
            const def = ctx.game.definitionOf(picked);
            if (isOption(def)) {
              await ctx.fx.useOptionFromHand(ctx, pickedId, def.playCost, {
                payCost: true,
                costDelta: COST_REDUCTION,
              });
            } else {
              await ctx.fx.playFromHand([pickedId], { payCost: true, costDelta: COST_REDUCTION });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/option-main-suspend-and-lock`,
          description:
            "[Main] You may suspend 2 of your opponent's Digimon or Tamers. Then, 3 of their " +
            "Digimon or Tamers can't unsuspend until their turn ends.",
          optional: false,
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const opponentPermanents = ctx.game.player(opponentSeat).battleArea.filter((p) => {
              if (p.inBreeding || p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) || isTamer(def);
            });
            if (opponentPermanents.length === 0) return;

            const suspendable = opponentPermanents.filter((p) => !p.isSuspended).map((p) => p.permanentId);
            if (suspendable.length > 0) {
              const take = Math.min(2, suspendable.length);
              const willSuspend = await ctx.ask.optional(ctx, "Suspend 2 of your opponent's Digimon or Tamers?");
              if (willSuspend) {
                const chosen =
                  suspendable.length <= take
                    ? suspendable
                    : await ctx.ask.chooseTargets(ctx, { candidates: suspendable, min: take, max: take });
                if (chosen.length > 0) await ctx.fx.suspend(chosen);
              }
            }

            const lockable = opponentPermanents.map((p) => p.permanentId);
            const lockTake = Math.min(3, lockable.length);
            const locked =
              lockable.length <= lockTake
                ? lockable
                : await ctx.ask.chooseTargets(ctx, { candidates: lockable, min: lockTake, max: lockTake });
            for (const id of locked) {
              ctx.fx.restrict(id, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/succession-ceresmon`,
          description:
            "＜Succession ([Ceresmon])＞ This Digimon gains all effects other than " +
            "＜Succession＞ on its topmost [Ceresmon] digivolution card.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.conferredToPermanentId === undefined,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            for (let index = self.stack.length - 1; index >= 0; index -= 1) {
              const stackCard = self.stack[index]!;
              if (!stackCard.faceUp || ctx.game.definitionOf(stackCard).nameEn !== "Ceresmon") continue;
              ctx.fx.conferStackEffects(self.permanentId, stackCard.instanceId, EffectDuration.Permanent);
              break;
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/rule-vegetation-trait`,
          description: "[Rule] Trait: Has [Vegetation] Type.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = ctx.source.permanent();
            if (me === undefined) return;
            ctx.fx.grantNameTrait(me.permanentId, "trait", ["Vegetation"], EffectDuration.Permanent);
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
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
