// @ts-nocheck
import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT14-083 — Joe Kido (BT14, Yellow Tamer).
 *
 *
 * Printed text (no errata):
 *   [On Play] Trash 1 card from the top of your opponent's Digimon's digivolution cards.
 *   [Your Turn][Once Per Turn] When a digivolution card of an opponent's Digimon is
 *   trashed, by suspending this Tamer, gain 1 memory.
 *   [Security] Play this card without paying its memory cost.
 */
const cardId = "BT14-083";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn][Once Per Turn] When a digivolution card of an OPPONENT's Digimon is
    // trashed, by suspending this Tamer, gain 1 memory. Modeled as a static install
    // (source pattern: ST24-13) that subscribes to onDigivolutionCardDiscarded, gated
    // on the trashed card's host being controlled by this Tamer's opponent. The
    // "suspend this Tamer" cost naturally enforces the once-per-turn budget (an already
    // -suspended Tamer can't pay the cost again until it untaps).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-opponent-divo-trashed-suspend-gain-memory`,
          description:
            "[Your Turn][Once Per Turn] When a digivolution card of an opponent's Digimon is " +
            "trashed, by suspending this Tamer, gain 1 memory.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onDigivolutionCardDiscarded",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId}: opponent Digimon digivolution card trashed → suspend Tamer, gain 1 memory.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const hostPerm = subCtx.game.permanentById(subjectId);
                if (hostPerm === undefined) return false;
                return hostPerm.controllerSeat !== source.ownerSeat;
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
                subCtx.fx.gainMemory(1);
              },
            });
          },
        }),
      ];
    }

    // [On Play] Trash 1 digivolution card from top of opponent's Digimon.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-divo`,
          description:
            "[On Play] Trash 1 card from the top of your opponent's Digimon's digivolution cards.",
          optional: false,
          canActivate: (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.some((p) => p.stack.length >= 1);
          },
          resolve: async (ctx) => {
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            const candidates = opp.battleArea
              .filter((p) => p.stack.length >= 1)
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const selected = await ctx.ask.selectPermanents(ctx, {
              candidates,
              min: 1,
              max: 1,
            });

            if (selected.length > 0) {
              const perm = ctx.game.permanentById(selected[0]);
              if (perm && perm.stack.length >= 1) {
                const topDivocard = perm.stack[perm.stack.length - 1];
                await ctx.fx.trash([topDivocard.instanceId]);
              }
            }
          },
        }),
      ];
    }

    // [Security] Play this card without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying its memory cost.",
          optional: false,
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
