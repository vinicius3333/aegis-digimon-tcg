import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, colorWaiverStatic, security, securityStatic } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT24-094";

function hasTsColor(def: CardDefinition): boolean {
  return (
    isDigimon(def) &&
    (def.types ?? []).includes("TS") &&
    (def.colors ?? []).some((color) => color === "Yellow" || color === "Green")
  );
}

function hasNoFaceUpSecurity(ctx: EffectContext, source: CardSource): boolean {
  return !ctx.game.player(source.ownerSeat).security.some((card) => card.faceUp === true);
}

function eligibleTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  return ctx.game.player(source.ownerSeat).battleArea.filter((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    return hasTsColor(ctx.game.definitionOf(permanent.topCard));
  });
}

function eligibleHand(ctx: EffectContext, source: CardSource): CardInstance[] {
  return ctx.game.player(source.ownerSeat).hand.filter((card) => hasTsColor(ctx.game.definitionOf(card)));
}

function eligibleSecurityPlay(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return [...owner.hand, ...owner.trash].filter((card) => {
    const def = ctx.game.definitionOf(card);
    return hasTsColor(def) && (def.level ?? Number.POSITIVE_INFINITY) <= 4;
  });
}

function hasNamedDigimon(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((permanent) => {
    if (permanent.inBreeding || permanent.topCard === undefined) return false;
    const def = ctx.game.definitionOf(permanent.topCard);
    return isDigimon(def) && ["Merukimon", "Minervamon"].some((name) => def.nameEn.includes(name));
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/no-face-up-security-waiver`,
          description: "While you have no face-up security cards, ignore this card's color requirements.",
          optional: false,
          when: (ctx) => hasNoFaceUpSecurity(ctx, source),
          resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd),
        }),
        securityStatic({
          source,
          effectKey: `${cardId}/security-all-turns-ts-boost`,
          description: "[Security][All Turns] Your green or yellow [TS] Digimon get +2000 DP and may gain Alliance.",
          optional: false,
          when: (_ctx) => source.isInSecurity?.() === true,
          resolve: async (ctx) => {
            const targets = eligibleTargets(ctx, source);
            for (const permanent of targets) {
              ctx.fx.modifyDP(permanent.permanentId, 2000, EffectDuration.UntilEachTurnEnd);
              if (hasNamedDigimon(ctx, source))
                ctx.fx.grantKeyword(permanent.permanentId, "Alliance", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Add your bottom security card to hand, place this card face-up at the bottom, then play a reduced [TS] Digimon.",
          optional: false,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.security.length > 0) await ctx.fx.securityToHand(source.ownerSeat, 1, { fromTop: false });
            await ctx.fx.addSecurity(source.ownerSeat, [source.instanceId], { toTop: false, faceUp: true });
            const candidates = eligibleHand(ctx, source);
            if (candidates.length === 0) return;
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((card) => card.instanceId),
              min: 0,
              max: 1,
            });
            if (selected.length > 0) await ctx.fx.playInstances(selected, { payCost: true, costDelta: 3 });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-level-4-ts`,
          description:
            "[Security] You may play 1 level 4 or lower green or yellow [TS] Digimon from hand or trash free.",
          optional: false,
          resolve: async (ctx) => {
            const candidates = eligibleSecurityPlay(ctx, source);
            if (candidates.length === 0) return;
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((card) => card.instanceId),
              min: 0,
              max: 1,
            });
            if (selected.length > 0) await ctx.fx.playInstances(selected, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
