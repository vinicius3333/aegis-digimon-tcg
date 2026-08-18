import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, staticModifier, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT24-102 — Homeros (BT24, Red/White Tamer, "Iliad"/"TS" traits).
 *
 * Printed text (no errata):
 *   [Start of Your Main Phase] Gain 1 memory. Then, if you have 5 or more memory, suspend
 *     this Tamer and ＜Draw 1＞.
 *   [All Turns] All of your [TS] trait Digimon get +1000 DP.
 *   [End of Your Turn] By suspending this Tamer, you may activate 1 [On Play] or [When
 *     Digivolving] effect of 1 of your [Olympos XII] trait Digimon.
 *   [Security] Play this card without paying the cost.
 *
 * KB (node tools/kb/query.mjs card BT24-102):
 *   - Q5719: "5 or more memory" reads the memory gauge from THIS Tamer's controller's own
 *     side — the `when` gate below already requires `isOwnersTurn()`, so `state.memory`
 *     (turn-relative) is already owner-relative at this point; no seat-flip needed.
 *   - Q5720/Q6251: the [Start of Your Main Phase] suspend + Draw 1 is MANDATORY once the
 *     memory threshold is met (not "you may"), and fires even if the Tamer is prevented from
 *     suspending (Draw 1 still happens) — modeled here as an unconditional `suspend` attempt
 *     (a no-op if already suspended/prevented) followed by the draw regardless of outcome.
 *   - Q5721/Q6029: the [End of Your Turn] activation is a genuine re-fire honoring the
 *     target's own gates (a disabled/already-used-up effect cannot be forced through) —
 *     `reactivateOnPlay`'s `canTrigger`/`canActivate`/UseTracker checks already enforce this.
 *
 * "Activate 1 [On Play] or [When Digivolving] effect" is a COMBINED pool across both timings
 * (`reactivateOnPlay` with `timings: [OnPlay, WhenDigivolving]`, `chooseOne: true` — the
 * default), not two separate choices.
 */
const cardId = "BT24-102";

function hasOlymposXiiTrait(types: readonly string[] | undefined): boolean {
  return types?.includes("Olympos XII") ?? false;
}

function hasTsTrait(types: readonly string[] | undefined): boolean {
  return types?.includes("TS") ?? false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] Gain 1 memory. Then, if you have 5+ memory, suspend this
    // Tamer and <Draw 1>.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-gain-memory-draw`,
          description:
            "[Start of Your Main Phase] Gain 1 memory. Then, if you have 5 or more memory, " +
            "suspend this Tamer and ＜Draw 1＞.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
            // The `when` gate guarantees this is the owner's own turn, so the turn-relative
            // `state.memory` is already this Tamer's controller's own-perspective value.
            if (ctx.game.state.memory < 5) return;
            const self = ctx.source.permanent();
            if (self === undefined) return;
            await ctx.fx.suspend([self.permanentId]);
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    // [All Turns] All of your [TS] trait Digimon get +1000 DP.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/ts-trait-plus-1000-dp`,
          description: "[All Turns] All of your [TS] trait Digimon get +1000 DP.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            for (const permanent of owner.battleArea) {
              if (permanent.inBreeding || permanent.topCard === undefined) continue;
              const def = ctx.game.definitionOf(permanent.topCard);
              if (!isDigimon(def) || !hasTsTrait(def.types)) continue;
              ctx.fx.modifyDP(permanent.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    // [End of Your Turn] By suspending this Tamer, you may activate 1 [On Play] or [When
    // Digivolving] effect of 1 of your [Olympos XII] trait Digimon.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn-activate-olympos-xii`,
          description:
            "[End of Your Turn] By suspending this Tamer, you may activate 1 [On Play] or " +
            "[When Digivolving] effect of 1 of your [Olympos XII] trait Digimon.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.isSuspended || perm.inBreeding) return false;
            const owner = ctx.game.player(source.ownerSeat);
            return owner.battleArea.some((p) => {
              if (p.inBreeding || p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) && hasOlymposXiiTrait(def.types);
            });
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.battleArea
              .filter((p) => {
                if (p.inBreeding || p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) && hasOlymposXiiTrait(def.types);
              })
              .map((p) => p.permanentId);
            if (candidates.length === 0) return;

            const willActivate = await ctx.ask.optional(
              ctx,
              "Suspend this Tamer to activate 1 [On Play] or [When Digivolving] effect of 1 of " +
                "your [Olympos XII] trait Digimon?",
            );
            if (!willActivate) return;

            const paid = ctx.fx.payActivationCost?.(self.permanentId, "suspend");
            if (!paid) return;

            const picked = await ctx.ask.selectPermanents(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (picked.length === 0) return;

            await ctx.fx.reactivateOnPlay?.(picked[0]!, {
              timings: [EffectTiming.OnPlay, EffectTiming.WhenDigivolving],
            });
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
