import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX12-072";

function hasME(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("ME");
}

/**
 * §16-42-1 gate for ＜Use Req. ([ME] trait)＞: true only while the controller has a
 * [ME] trait Digimon in the battle area (the corpus' `youHave` default zone — see
 * interpreter.ts `countMatching`, mirroring §4-21-2's "on your field" wording).
 */
function hasMEInPlay(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const permanent of owner.battleArea) {
    if (permanent.topCard == null) continue;
    if (hasME(ctx.game.definitionOf(permanent.topCard))) return true;
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Choose 1 card from your security stack and add it to your hand. Then, " +
            "place this card from your hand face up at the bottom of your security stack.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.security.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: owner.security.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;
            await ctx.fx.securityToHand(source.ownerSeat, 1, { fromTop: false });
            await ctx.fx.addSecurity(source.ownerSeat, [source.instanceId], { toTop: false, faceUp: true });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-me`,
          description:
            "[Security] You may play 1 [ME] trait Digimon card with a play cost of 5 or less " +
            "from your hand or trash without paying the cost.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const fromHand = Array.from(owner.hand).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return hasME(def) && (def.playCost ?? 99) <= 5;
            });
            const fromTrash = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return hasME(def) && (def.playCost ?? 99) <= 5;
            });
            const allCandidates = [...fromHand, ...fromTrash];
            if (allCandidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: allCandidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        // <Use Req. ([ME] trait)> — while you have a [ME] trait card in play, you may
        // use/play this card ignoring its color requirements (§16-42-1).
        // `colorWaiverStatic` (not `staticModifier`): this card is HAND-resident when the
        // waiver needs to apply, so it must not carry the on-field base guard.
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-me`,
          description: "<Use Req. ([ME] trait)> Ignore this card's color requirements.",
          when: (ctx) => hasMEInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/guard-all-turns`,
          description:
            "[All Turns] All of your [ME] trait Digimon gain ＜Guard＞.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            for (const p of owner.battleArea) {
              if (p.topCard !== undefined && hasME(ctx.game.definitionOf(p.topCard))) {
                ctx.fx.grantKeyword(p.permanentId, "Guard", EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
