import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX5-027 — Liollmon (EX5, Yellow Lv.3 Digimon).
 *
 * Digivolution requirement: 0 from Frimon (handled by engine).
 * [On Play] Search your security stack. You may add 1 card with [Leomon] in its
 *   name to your hand. If you added a card, <Recovery +1 (Deck)>. Shuffle security.
 * Inherited [On Deletion] 1 opponent Digimon -2000 DP until opponent's turn end.
 */
const cardId = "EX5-027";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-security-search`,
          description:
            "[On Play] Search your security stack. You may add 1 card with [Leomon] in its name among them to the hand. If you added a card, <Recovery +1 (Deck)>. Then, shuffle your security stack.",
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).security.length >= 1,
          resolve: async (ctx) => {
            const security = ctx.game.player(source.ownerSeat).security;
            const leoIds = security
              .filter((c) => ctx.game.definitionOf(c).nameEn.includes("Leomon"))
              .map((c) => c.instanceId);

            let added = false;
            if (leoIds.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: leoIds,
                min: 0,
                max: 1,
                visible: security.map((c) => c.instanceId),
              });
              if (chosen.length > 0) {
                await ctx.fx.returnToHand(chosen);
                added = true;
              }
            }

            if (added) {
              await ctx.fx.recoverToSecurity(source.ownerSeat, 1);
            }

            ctx.fx.shuffleSecurity(source.ownerSeat);
          },
        }),
      ];
    }

    // Inherited [On Deletion] -2000 DP to 1 opponent Digimon.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/inh-on-deletion`,
          description:
            "Inherited: [On Deletion] 1 of your opponent's Digimon gets -2000 DP until the end of their turn.",
          optional: false,
          isInherited: true,
          resolve: async (ctx) => {
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const targets = opp.battleArea
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets,
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              ctx.fx.modifyDP(chosen[0]!, -2000, EffectDuration.UntilOpponentTurnEnd);
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
