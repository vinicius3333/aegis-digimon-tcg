import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * ST16-14 — Matt Ishida (ST16, Yellow Tamer).
 *
 *
 * [Start of Your Turn] If your memory is at 2 or lower, set it to 3.
 * [All Turns] When one of your effects trashes a card in your hand, by suspending
 *   this Tamer, gain 1 memory.
 * [Security] Play this Tamer without paying its memory cost.
 *
 *   EffectTiming.OnStartTurn → the effect factory.SetMemoryTo3TamerEffect.
 *   EffectTiming.OnDiscardHand → SubTrigger(whenHandTrashed), optional, suspend cost.
 *   EffectTiming.SecuritySkill → PlaySelfTamerSecurityEffect.
 */

const cardId = "ST16-14";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [Start of Your Turn] Set memory to 3 if <= 2 (documented behavior)
    if (timing === EffectTiming.OnStartTurn) {
      out.push(
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-your-turn-set-memory`,
          description: "[Start of Your Turn] If your memory is at 2 or lower, set it to 3.",
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) {
              ctx.fx.setMemory(3);
            }
          },
        }),
      );
    }

    // [All Turns] whenHandTrashed → optional: suspend self + gain 1 memory (documented behavior)
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/hand-trashed-suspend-gain-memory`,
          description:
            "[All Turns] When one of your effects trashes a card in your hand, " +
            "by suspending this Tamer, gain 1 memory.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.subscribeSubTrigger({
              event: "whenHandTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: hand trashed → suspend self + gain 1 memory`,
              matches: (subCtx) =>
                subCtx.trigger?.handTrashedSeat === source.ownerSeat,
              run: async (subCtx) => {
                const host = subCtx.source.permanent();
                if (host === undefined) return;
                // Cost: this Tamer must be unsuspended to pay (CanActivateSuspendCostEffect)
                if (host.isSuspended) return;

                const willActivate = await subCtx.ask.optional(
                  subCtx,
                  "Suspend this Tamer to gain 1 memory?",
                );
                if (!willActivate) return;

                await subCtx.fx.suspend([host.permanentId]);
                // [All Turns]: an effect can trash a hand card on either player's turn.
                subCtx.fx.gainMemoryForSeat(source.ownerSeat, 1);
              },
            });
          },
        }),
      );
    }

    // [Security] Play this Tamer without paying its memory cost (documented behavior)
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
