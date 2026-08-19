import { CardColor, EffectTiming, isDigimon, isTamer, type CardInstance, type Permanent } from "@aegis/shared";
import { canDigivolveOntoWithAlternates } from "../../engine/cards/cardData.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { security, turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT12-090 — Davis Motomiya. */
const cardId = "BT12-090";

function hasFreeDigimonOrKen(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
    if (permanent.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(permanent.topCard);
    return (
      (isDigimon(definition) && matchNameOrTrait(definition, { tokens: ["Free"], match: "trait" })) ||
      (isTamer(definition) && matchNameOrTrait(definition, { tokens: ["Ken Ichijoji"], match: "name" }))
    );
  });
}

function isExactlyBlueGreen(ctx: EffectContext, permanent: Permanent): boolean {
  const colors =
    ctx.game.effectiveColors?.(permanent) ??
    (permanent.topCard === undefined ? [] : ctx.game.definitionOf(permanent.topCard).colors);
  return colors.length === 2 && colors.includes(CardColor.Blue) && colors.includes(CardColor.Green);
}

function imperialdramonCandidates(ctx: EffectContext, attacker: Permanent): CardInstance[] {
  if (attacker.topCard === undefined) return [];
  const base = ctx.game.definitionOf(attacker.topCard);
  return ctx.game.player(attacker.controllerSeat).hand.filter((instance) => {
    const definition = ctx.game.definitionOf(instance);
    return (
      isDigimon(definition) &&
      matchNameOrTrait(definition, { tokens: ["Imperialdramon"], match: "name" }) &&
      canDigivolveOntoWithAlternates(definition, base)
    );
  });
}

function eligibleAttacker(ctx: EffectContext, source: CardSource): Permanent | undefined {
  if (!source.isOwnersTurn()) return undefined;
  const attackerId = ctx.trigger.attackerPermanentId;
  if (attackerId === undefined) return undefined;
  const attacker = ctx.game.permanentById(attackerId);
  if (attacker === undefined || attacker.controllerSeat !== source.ownerSeat) return undefined;
  return isExactlyBlueGreen(ctx, attacker) ? attacker : undefined;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-memory`,
          description:
            "[Start of Your Main Phase] If you have a Digimon with the [Free] trait or a " +
            "Tamer with [Ken Ichijoji] in its name in play, gain 1 memory.",
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => hasFreeDigimonOrKen(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/attack-digivolve`,
          description:
            "[Your Turn] When one of your 2-color blue and green Digimon attacks, by " +
            "suspending this Tamer, digivolve it into an [Imperialdramon] in your hand for its cost.",
          optional: true,
          attackScope: "ally",
          when: (ctx) => eligibleAttacker(ctx, source) !== undefined,
          canActivate: (ctx) => {
            const self = source.permanent();
            const attacker = eligibleAttacker(ctx, source);
            return (
              self !== undefined &&
              !self.isSuspended &&
              attacker !== undefined &&
              imperialdramonCandidates(ctx, attacker).length > 0
            );
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            const attacker = eligibleAttacker(ctx, source);
            if (self === undefined || self.isSuspended || attacker === undefined) return;
            const candidates = imperialdramonCandidates(ctx, attacker);
            if (candidates.length === 0) return;

            await ctx.fx.suspend([self.permanentId]);
            const [chosen] = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map(({ instanceId }) => instanceId),
              min: 1,
              max: 1,
              visibleCards: candidates.map(({ instanceId, cardId: visibleCardId }) => ({
                instanceId,
                cardId: visibleCardId,
              })),
            });
            if (chosen === undefined) return;
            await ctx.fx.digivolveFromInstance(attacker.permanentId, chosen, { payCost: true });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
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
