import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT21-083 — Taiki Kudo (BT21, Red Tamer).
 *
 *
 *   EffectTiming.OnStartMainPhase ([Start of Your Main Phase]):
 *     By placing 1 Digimon card with the [Xros Heart]/[Blue Flare]/[Hero] trait from
 *     your hand under this Tamer, <Draw 1> and gain 1 memory. Optional.
 *     (documented behavior)
 *     KB Q4597: the card is placed at the bottom of the cards under the Tamer.
 *
 *   EffectTiming.OnEnterFieldAnyone ([Your Turn]):
 *     When your Digimon are played or digivolve, if any of them have the [Xros Heart]/
 *     [Hero] trait, by suspending this Tamer, one of them may attack.
 *     (documented behavior)
 *     KB Q4598: only one attack can be declared even with 2 copies.
 *     KB Q4728: a Digimon played by End of Attack cannot attack with this effect.
 *
 *   EffectTiming.SecuritySkill: Play this card. (documented behavior)
 *
 */
const cardId = "BT21-083";

const XROS_HEART_HERO_TRAITS = new Set(["Xros Heart", "Hero"]);
const XROS_HEART_BLUE_FLARE_HERO_TRAITS = new Set(["Xros Heart", "Blue Flare", "Hero"]);

function hasXrosHeartOrHero(types: string[] | undefined): boolean {
  if (!types) return false;
  return types.some((t) => XROS_HEART_HERO_TRAITS.has(t));
}

function hasXrosHeartBlueFlareOrHero(types: string[] | undefined): boolean {
  if (!types) return false;
  return types.some((t) => XROS_HEART_BLUE_FLARE_HERO_TRAITS.has(t));
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] By placing 1 Digimon card with [Xros Heart]/[Blue Flare]/[Hero]
    // trait from your hand under this Tamer, <Draw 1> and gain 1 memory. (documented behavior)
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-place-digimon-draw-memory`,
          description:
            "[Start of Your Main Phase] By placing 1 Digimon card with the [Xros Heart]/" +
            "[Blue Flare]/[Hero] trait from your hand under this Tamer, <Draw 1> and gain 1 memory.",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(ctx.source.ownerSeat);
            return owner.hand.some((c) => {
              const def = ctx.game.definitionOf(c);
              if (!(def.kinds as string[]).includes(CardKind.Digimon as string)) return false;
              return hasXrosHeartBlueFlareOrHero(def.types);
            });
          },
          resolve: async (ctx) => {
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;

            const owner = ctx.game.player(ctx.source.ownerSeat);
            const candidates = owner.hand
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                if (!(def.kinds as string[]).includes(CardKind.Digimon as string)) return false;
                return hasXrosHeartBlueFlareOrHero(def.types);
              })
              .map((c) => c.instanceId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            // Place the card under this Tamer (KB Q4597: at the bottom of under-Tamer stack).
            await ctx.fx.placeUnder(selfPerm.permanentId, chosen);

            // Draw 1.
            await ctx.fx.draw(source.ownerSeat, 1);

            // Gain 1 memory.
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Your Turn] When your Digimon are played or digivolve, if any of them have the
    // [Xros Heart]/[Hero] trait, by suspending this Tamer, one of them may attack.
    // (documented behavior)
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-xros-heart-hero-attack`,
          description:
            "[Your Turn] When your Digimon are played or digivolve, if any of them have the " +
            "[Xros Heart]/[Hero] trait, by suspending this Tamer, one of them may attack.",
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            if (subject.controllerSeat !== source.ownerSeat) return false;
            const def = ctx.game.definitionOf(subject.topCard);
            if (!(def.kinds as string[]).includes(CardKind.Digimon as string)) return false;
            return hasXrosHeartOrHero(def.types);
          },
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            return perm !== undefined && !perm.isSuspended && !perm.inBreeding && ctx.source.isOwnersTurn();
          },
          resolve: async (ctx) => {
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return;

            // Re-verify trait at resolution time (the permanent may have changed).
            const def = ctx.game.definitionOf(subject.topCard);
            if (!hasXrosHeartOrHero(def.types)) return;
            if (subject.controllerSeat !== source.ownerSeat) return;

            // Cost: suspend this Tamer.
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            // The played/digivolving Digimon may attack.
            // forceAttack respects ongoing-attack restriction (KB Q4598/Q4728).
            await ctx.fx.forceAttack(subjectId);
          },
        }),
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
