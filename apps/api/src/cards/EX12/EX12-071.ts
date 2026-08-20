import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX12-071";

function hasSW(def: CardDefinition): boolean {
  return (def.types ?? []).includes("SW");
}

function hasSaneiketsu(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("Saneiketsu");
}

/**
 * §16-42-1 gate for ＜Use Req. ([SW] trait)＞: true only while the controller has a
 * [SW] trait card in the battle area (the corpus' `youHave` default zone — see
 * interpreter.ts `countMatching`, mirroring §4-21-2's "on your field" wording).
 */
function hasSWInPlay(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const permanent of owner.battleArea) {
    if (permanent.topCard == null) continue;
    if (hasSW(ctx.game.definitionOf(permanent.topCard))) return true;
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
            "[Main] By trashing 1 [SW] trait card from your hand, <Draw 2>. Then, place this " +
            "card in your battle area.",
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const swCards = Array.from(owner.hand).filter((c) => hasSW(ctx.game.definitionOf(c)));
            if (swCards.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: swCards.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;
            await ctx.fx.trash(chosen);
            ctx.fx.draw(source.ownerSeat, 2);
            if (ctx.fx.placeOptionAsPermanent) {
              await ctx.fx.placeOptionAsPermanent(source.instanceId);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (_ctx) => {
            // ActivateMain — delegates to the OnUseOption handler above
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        // <Use Req. ([SW] trait)> — while you have a [SW] trait card in play, you may
        // use/play this card ignoring its color requirements (§16-42-1).
        // `colorWaiverStatic` (not `staticModifier`): this card is HAND-resident when the
        // waiver needs to apply, so it must not carry the on-field base guard.
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-sw`,
          description: "<Use Req. ([SW] trait)> Ignore this card's color requirements.",
          when: (ctx) => hasSWInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/delay-trigger`,
          description:
            "[All Turns] ＜Delay＞ When one of your [SW] trait Digimon is played, you may " +
            "digivolve 1 of your Digimon into a [Saneiketsu] trait Digimon from your hand " +
            "without paying the cost.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: Delay — digivolve into Saneiketsu when SW is played.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasSW(def);
              },
              run: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                const saneiketsuCards = Array.from(owner.hand).filter((c) =>
                  hasSaneiketsu(subCtx.game.definitionOf(c)),
                );
                if (saneiketsuCards.length === 0) return;
                const hostDigimon = Array.from(owner.battleArea)
                  .filter((p) => p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)));
                if (hostDigimon.length === 0) return;
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Digivolve 1 of your Digimon into a [Saneiketsu] Digimon from hand without paying cost?",
                );
                if (!yes) return;
                const host = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: hostDigimon.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                });
                if (host.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: saneiketsuCards.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.digivolveFromInstance(host[0]!, chosen[0]!, { payCost: false, ignoreRequirements: true });
                }
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
