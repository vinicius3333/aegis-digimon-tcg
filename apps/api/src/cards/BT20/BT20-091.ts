import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT20-091";

function hasRoyalKnightTrait(types: string[] | undefined): boolean {
  return types?.includes("Royal Knight") ?? false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn] When your Digimon are played or digivolve, if any of them have the
    // [Royal Knight] trait, by suspending this Tamer, <Draw 1> and gain 1 memory.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-royal-knight-draw-memory`,
          description:
            "[Your Turn] When your Digimon are played or digivolve, if any of them have " +
            "the [Royal Knight] trait, by suspending this Tamer, <Draw 1> and gain 1 memory.",
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            if (subject.controllerSeat !== source.ownerSeat) return false;
            const def = ctx.game.definitionOf(subject.topCard);
            if (!def.kinds.includes(CardKind.Digimon)) return false;
            return hasRoyalKnightTrait(def.types);
          },
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            return perm !== undefined && !perm.isSuspended && !perm.inBreeding;
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
        // [Opponent's Turn][Once Per Turn] When any of your Digimon with the [Royal Knight]
        // trait would leave the battle area, you may play 1 [Omekamon] from your hand without
        // paying the cost. Installed once, when this Tamer itself enters the field (mirrors
        // BT21-062's leave-prevention install pattern) — the subscription then lives until
        // this Tamer leaves (dropPermanent teardown).
        {
          effectKey: `${cardId}/install-royal-knight-omekamon-on-leave`,
          description:
            "[Opponent's Turn][Once Per Turn] When any of your Digimon with the [Royal Knight] " +
            "trait would leave the battle area, you may play 1 [Omekamon] from your hand " +
            "without paying the cost.",
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (ctx) => {
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const perm = ctx.game.permanentById(subjectId);
            if (perm === undefined || perm.topCard === undefined) return false;
            return perm.topCard.instanceId === source.instanceId;
          },
          canActivate: () => true,
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const selfPermanentId = selfPerm.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: selfPermanentId,
              mode: "instead",
              description:
                "[Opponent's Turn][Once Per Turn] When any of your Digimon with the [Royal " +
                "Knight] trait would leave the battle area, you may play 1 [Omekamon] from " +
                "your hand without paying the cost.",
              oncePerTurnKey: `${cardId}/opponent-turn-play-omekamon`,
              appliesTo: (subCtx, leavingPermanentId) => {
                if (leavingPermanentId === selfPermanentId) return false; // excludes the Tamer
                if (subCtx.source.isOwnersTurn()) return false; // [Opponent's Turn] only
                const leaving = subCtx.game.permanentById(leavingPermanentId);
                if (leaving === undefined || leaving.topCard === undefined) return false;
                if (leaving.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(leaving.topCard);
                if (!def.kinds.includes(CardKind.Digimon)) return false;
                return hasRoyalKnightTrait(def.types);
              },
              apply: async (subCtx) => {
                const hand = subCtx.game.player(source.ownerSeat).hand;
                const candidates = hand
                  .filter((c) => subCtx.game.definitionOf(c).nameEn === "Omekamon")
                  .map((c) => c.instanceId);
                if (candidates.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates,
                  min: 0,
                  max: 1,
                });
                if (chosen.length === 0) return;
                await subCtx.fx.playFromHand(chosen, { payCost: false });
              },
            });
          },
        },
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
