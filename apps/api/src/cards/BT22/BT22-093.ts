import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT22-093 — Ami Aiba (BT22, White Tamer).
 *
 *
 *   EffectTiming.OnStartMainPhase ([Start of Your Main Phase]):
 *     If your opponent has a Digimon, gain 1 memory. (documented behavior)
 *
 *   EffectTiming.OnEnterFieldAnyone ([Your Turn]):
 *     When any of your Digimon digivolve into a Digimon with the [CS] trait, if it has a
 *     digivolution card with the same level as the digivolved Digimon, by suspending this
 *     Tamer, that Digimon may digivolve into a Digimon card with the [CS] trait in the
 *     hand without paying the cost. (documented behavior)
 *
 *     KB Q4964: the "same level" check uses the NEWLY digivolved Digimon's level vs the
 *     cards in its digivolution stack. After digivolving via this effect, the stack no
 *     longer has a card of the new (higher) level, so a 2nd copy's effect won't activate.
 *
 *   EffectTiming.SecuritySkill: Play this card. (documented behavior)
 */
const cardId = "BT22-093";

function hasCSTrait(types: string[] | undefined): boolean {
  return types?.includes("CS") ?? false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
    // (documented behavior)
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-gain-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            const opponentDigimon = ctx.game
              .player(opponentSeat)
              .battleArea.filter(
                (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
              );
            return opponentDigimon.length >= 1;
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Your Turn] When any of your Digimon digivolve into a Digimon with the [CS] trait,
    // if it has a digivolution card with the same level as the digivolved Digimon, by
    // suspending this Tamer, that Digimon may digivolve into a Digimon card with the
    // [CS] trait in the hand without paying the cost. (documented behavior)
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-cs-digivolve-chain`,
          description:
            "[Your Turn] When any of your Digimon digivolve into a Digimon with the [CS] trait, " +
            "if it has a digivolution card with the same level as the digivolved Digimon, by " +
            "suspending this Tamer, that Digimon may digivolve into a Digimon card with the [CS] " +
            "trait in the hand without paying the cost.",
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            if (subject.controllerSeat !== source.ownerSeat) return false;
            const def = ctx.game.definitionOf(subject.topCard);
            if (!isDigimon(def) || !hasCSTrait(def.types)) return false;
            // Must have a digivolution card with the same level as the digivolved Digimon.
            // KB Q4964: "the same level as the digivolved Digimon" = same level as def.level.
            const subjectLevel = def.level;
            if (subjectLevel === undefined) return false;
            return subject.stack.some((c) => {
              const stackDef = ctx.game.definitionOf(c);
              return stackDef.level === subjectLevel;
            });
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

            // Re-verify at resolution: must still be a CS Digimon with same-level digi-card.
            const def = ctx.game.definitionOf(subject.topCard);
            if (!isDigimon(def) || !hasCSTrait(def.types)) return;
            const subjectLevel = def.level;
            if (subjectLevel === undefined) return;
            const hasSameLevelCard = subject.stack.some((c) => {
              const stackDef = ctx.game.definitionOf(c);
              return stackDef.level === subjectLevel;
            });
            if (!hasSameLevelCard) return;
            if (subject.controllerSeat !== source.ownerSeat) return;

            // Cost: suspend this Tamer.
            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            // Find [CS] trait Digimon cards in hand that can digivolve onto the subject.
            const owner = ctx.game.player(source.ownerSeat);
            const csHandCandidates = owner.hand
              .filter((c) => {
                const handDef = ctx.game.definitionOf(c);
                if (!(handDef.kinds as string[]).includes(CardKind.Digimon as string)) return false;
                return hasCSTrait(handDef.types);
              })
              .map((c) => c.instanceId);

            if (csHandCandidates.length === 0) return;

            // Let the controller pick which CS card to digivolve into (optional — canNoSelect).
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: csHandCandidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            // Digivolve into the chosen card without paying the cost.
            await ctx.fx.digivolveFromInstance(subjectId, chosen[0]!, { payCost: false });
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
