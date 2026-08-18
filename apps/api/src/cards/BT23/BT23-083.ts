import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT23-083 — Green Tamer (BT23, Fei).
//
// [Start of Your Main Phase] If you have a Digimon with the [Royal Base] or [CS] trait,
//   gain 1 memory.
// [All Turns] When cards are placed face up in your security stack, if any of them have
//   the [Zaxon] or [Royal Base] trait, by suspending this Tamer, gain 1 memory. Then,
//   if you have 7 or fewer cards in your hand, <Draw 1>.
// [Security] Play this card without paying the cost.

const cardId = "BT23-083";

function hasRoyalBaseOrCsDigimon(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const p of owner.battleArea) {
    if (p.topCard == null || !isDigimon(ctx.game.definitionOf(p.topCard))) continue;
    const traits = ctx.game.definitionOf(p.topCard).types ?? [];
    if (traits.includes("Royal Base") || traits.includes("CS")) return true;
  }
  return false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase`,
          description:
            "[Start of Your Main Phase] If you have a Digimon with the [Royal Base] or [CS] trait, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => hasRoyalBaseOrCsDigimon(ctx, source),
          resolve: async (ctx) => {
            // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
            // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
            // owner explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
          },
        }),
      ];
    }

    // [All Turns] When cards are placed face up in your security stack, if any of them have
    // the [Zaxon] or [Royal Base] trait, by suspending this Tamer, gain 1 memory. Then, if
    // you have 7 or fewer cards in your hand, <Draw 1>. (KB Q5356: the tail — memory AND
    // draw — is gated on the "by suspending" cost; declining pays nothing at all.)
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-security-add-suspend-gain-memory-draw`,
          description:
            "[All Turns] When cards are placed face up in your security stack, if any of " +
            "them have the [Zaxon] or [Royal Base] trait, by suspending this Tamer, gain 1 " +
            "memory. Then, if you have 7 or fewer cards in your hand, ＜Draw 1＞.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenAddSecurity",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId}: [Zaxon]/[Royal Base] card added face up to your security -> suspend, gain 1 memory, conditional draw.`,
              matches: (subCtx) => {
                if (subCtx.trigger?.addedToSecuritySeat !== source.ownerSeat) return false;
                const addedIds = subCtx.trigger?.addedToSecurityInstanceIds ?? [];
                if (addedIds.length === 0) return false;
                const security = subCtx.game.player(source.ownerSeat).security;
                return addedIds.some((id) => {
                  const card = security.find((c) => c.instanceId === id);
                  if (card === undefined || !card.faceUp) return false;
                  const traits = subCtx.game.definitionOf(card).types ?? [];
                  return traits.includes("Zaxon") || traits.includes("Royal Base");
                });
              },
              run: async (subCtx) => {
                const host = subCtx.source.permanent();
                if (host === undefined || host.isSuspended) return;
                const willActivate = await subCtx.ask.optional(
                  subCtx,
                  "Suspend this Tamer to gain 1 memory?",
                );
                if (!willActivate) return;
                await subCtx.fx.suspend([host.permanentId]);
                // [All Turns]: cards can be placed face up in security on either turn.
                subCtx.fx.gainMemoryForSeat(source.ownerSeat, 1);
                const owner = subCtx.game.player(source.ownerSeat);
                if (owner.hand.length <= 7) {
                  await subCtx.fx.draw(source.ownerSeat, 1);
                }
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
