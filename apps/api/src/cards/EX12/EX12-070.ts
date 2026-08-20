import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX12-070";

function hasTB(def: CardDefinition): boolean {
  return (def.types ?? []).includes("TB");
}

function hasSanmyojin(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("Sanmyojin");
}

/**
 * §16-42-1 gate for ＜Use Req. ([TB] trait)＞: true only while the controller has a
 * [TB] trait card in the battle area (the corpus' `youHave` default zone — see
 * interpreter.ts `countMatching`, mirroring §4-21-2's "on your field" wording).
 */
function hasTBInPlay(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const permanent of owner.battleArea) {
    if (permanent.topCard == null) continue;
    if (hasTB(ctx.game.definitionOf(permanent.topCard))) return true;
  }
  return false;
}

async function executeMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const tbCards = Array.from(owner.hand).filter((c) => hasTB(ctx.game.definitionOf(c)));
  if (tbCards.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, { candidates: tbCards.map((c) => c.instanceId), min: 0, max: 1 });
  if (chosen.length === 0) return;
  await ctx.fx.trash(chosen);
  ctx.fx.draw(source.ownerSeat, 2);
  if (ctx.fx.placeOptionAsPermanent) await ctx.fx.placeOptionAsPermanent(source.instanceId);
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
            "[Main] By trashing 1 [TB] trait card from your hand, <Draw 2>. Then, place this " +
            "card in your battle area.",
          resolve: async (ctx) => executeMain(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => executeMain(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        // <Use Req. ([TB] trait)> — while you have a [TB] trait card in play, you may
        // use/play this card ignoring its color requirements (§16-42-1).
        // `colorWaiverStatic` (not `staticModifier`): this card is HAND-resident when the
        // waiver needs to apply, so it must not carry the on-field base guard.
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-tb`,
          description: "<Use Req. ([TB] trait)> Ignore this card's color requirements.",
          when: (ctx) => hasTBInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/delay-trigger`,
          description:
            "[All Turns] ＜Delay＞ When one of your Lv.5 or higher [TB] trait Digimon would " +
            "leave the battle area, you may play 1 [Sanmyojin] trait Digimon from your hand " +
            "without paying the cost.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "wouldBeReturned",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: Delay — play Sanmyojin when TB lv5+ would leave.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                if (!isDigimon(def)) return false;
                if ((def.level ?? 0) < 5) return false;
                return hasTB(def);
              },
              run: async (subCtx) => {
                const owner = subCtx.game.player(source.ownerSeat);
                const sanmyojinCards = Array.from(owner.hand).filter((c) =>
                  hasSanmyojin(subCtx.game.definitionOf(c)),
                );
                if (sanmyojinCards.length === 0) return;
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Play 1 [Sanmyojin] trait Digimon from your hand without paying the cost?",
                );
                if (!yes) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: sanmyojinCards.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await subCtx.fx.playInstances(chosen, { payCost: false });
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
