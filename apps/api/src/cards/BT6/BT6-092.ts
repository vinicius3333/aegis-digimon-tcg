import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT6-092 — Menoa & Eosmon (BT6, White Tamer).
 *
 * [Start of Your Turn] If memory is ≤2, set it to 3.
 *
 * [Your Turn] When you play an [Eosmon], you may suspend this Tamer to reveal the
 * top 3 cards of your deck. Add 1 Tamer or [Eosmon] Digimon to hand. Rest to
 * deck bottom.
 *
 * [Opponent's Turn] If you have an [Eosmon] in play, opponent Tamers don't
 * unsuspend during their unsuspend phase.
 *
 * [Security] Play this card without paying its memory cost.
 */
const cardId = "BT6-092";

function isTamer(def: CardDefinition): boolean {
  return (def.kinds as string[]).includes("Tamer");
}

function isEosmonOrTamer(def: CardDefinition): boolean {
  if (isTamer(def)) return true;
  if ((def.kinds as string[]).includes("Digimon")) return def.nameEn.includes("Eosmon");
  return false;
}

function hasEosmonInPlay(ctx: EffectContext, ownerSeat: 0 | 1): boolean {
  return ctx.game.player(ownerSeat).battleArea.some((p) => {
            const def = ctx.game.definitionOf(p.topCard);
            return def?.nameEn.includes("Eosmon");
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [Start of Your Turn] Set memory to 3
    if (timing === EffectTiming.OnStartTurn) {
      out.push(
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-memory`,
          description: "[Start of Your Turn] Set your memory to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn() && ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      );
    }

    // [Your Turn] When Eosmon played, suspend to reveal. This is a watcher over
    // the canonical whenPlayed event so the played permanent is available to
    // both the trigger gate and the client decision round-trip.
    if (timing === EffectTiming.None) {
      out.push(staticModifier({
        effectKey: `${cardId}/on-eosmon-played-reveal`,
        source,
        description:
          "[Your Turn] When you play an [Eosmon], you may suspend this Tamer to reveal top 3 of deck. Add 1 Tamer or [Eosmon] Digimon to hand. Rest to deck bottom.",
        when: (ctx) => ctx.source.isOnBattleArea(),
        resolve: async (ctx) => {
          ctx.fx.subscribeSubTrigger({
            event: "whenPlayed",
            sourcePermanentId: ctx.source.permanent()?.permanentId,
            once: false,
            description: `${cardId}: suspend to search after playing Eosmon`,
            matches: (subCtx) => {
              if (!subCtx.source.isOwnersTurn()) return false;
              const sourcePermanent = subCtx.source.permanent();
              if (sourcePermanent === undefined || sourcePermanent.isSuspended) return false;
              const subjectId = subCtx.trigger.subjectPermanentId;
              if (subjectId === undefined) return false;
              const played = subCtx.game.permanentById(subjectId);
              if (played === undefined || played.controllerSeat !== source.ownerSeat) return false;
              return subCtx.game.definitionOf(played.topCard).nameEn.includes("Eosmon");
            },
            run: async (subCtx) => {
              if (!(await subCtx.ask.optional(subCtx, "Suspend this Tamer to reveal the top 3 cards of your deck?"))) return;
              const sourcePermanent = subCtx.source.permanent();
              if (sourcePermanent === undefined || sourcePermanent.isSuspended) return;
              await subCtx.fx.suspend([sourcePermanent.permanentId]);
              const deck = subCtx.game.player(source.ownerSeat).deck;
              if (deck.length === 0) return;
              const revealed = deck.slice(0, Math.min(3, deck.length));
              const candidates = revealed
                .filter((card) => isEosmonOrTamer(subCtx.game.definitionOf(card)))
                .map((card) => card.instanceId);
              const selected = await subCtx.ask.selectCards(subCtx, {
                candidates,
                min: candidates.length > 0 ? 1 : 0,
                max: candidates.length > 0 ? 1 : 0,
                visible: revealed.map((card) => card.instanceId),
                visibleCards: revealed.map((card) => ({
                  instanceId: card.instanceId,
                  cardId: card.cardId,
                })),
              });
              const selectedSet = new Set(selected);
              let rest = revealed.filter((card) => !selectedSet.has(card.instanceId)).map((card) => card.instanceId);
              if (selected.length > 0) await subCtx.fx.returnToHand(selected);
              if (rest.length > 1 && subCtx.ask.orderCards !== undefined) {
                rest = await subCtx.ask.orderCards(subCtx, {
                  candidates: rest,
                  visibleCards: revealed
                    .filter((card) => rest.includes(card.instanceId))
                    .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
                });
              }
              if (rest.length > 0) await subCtx.fx.returnToDeck(rest, { toTop: false });
            },
          });
        },
      }));
    }

    // [Opponent's Turn] Opponent Tamers don't unsuspend
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/opponent-turn-tamers-no-unsuspend`,
          description:
            "[Opponent's Turn] If you have an [Eosmon] in play, your opponent's Tamers don't unsuspend.",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (ctx.source.isOwnersTurn()) return false;
            return hasEosmonInPlay(ctx, source.ownerSeat);
          },
          resolve: async (ctx) => {
            const opponentSeat = (1 - source.ownerSeat) as 0 | 1;
            for (const p of ctx.game.player(opponentSeat).battleArea) {
          const def = ctx.game.definitionOf(p.topCard);
          if (def && (def.kinds as string[]).includes("Tamer")) {
                ctx.fx.restrict(p.permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
              }
            }
          },
        }),
      );
    }

    // [Security] Play this Tamer
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
