import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier, whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX7-049";

/** Shared de-digivolve body for [On Play] and [When Attacking]. */
async function deDigivolveOneOpponent(ctx: Parameters<Effect["resolve"]>[0]): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  const oppDigimon = ctx.game
    .player(opponentSeat)
    .battleArea.filter((p) => {
      if (p.topCard === undefined) return false;
      return isDigimon(ctx.game.definitionOf(p.topCard));
    })
    .map((p) => p.permanentId);

  if (oppDigimon.length === 0) return;

  const target =
    oppDigimon.length === 1
      ? oppDigimon[0]!
      : (await ctx.ask.chooseTargets(ctx, { candidates: oppDigimon, min: 1, max: 1 }))[0];

  if (target !== undefined) {
    ctx.fx.deDigivolve(target, 4, { stopAtLevel: 3 });
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] De-Digivolve 4 on 1 opponent Digimon (stops at level 3).
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-dedigivolve`,
          description:
            "[On Play] De-Digivolve 4 on 1 of your opponent's Digimon. " +
            "It can't go below level 3.",
          resolve: deDigivolveOneOpponent,
        }),
      ];
    }

    // [When Attacking] Same De-Digivolve 4 effect.
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-dedigivolve`,
          description:
            "[When Attacking] De-Digivolve 4 on 1 of your opponent's Digimon. " +
            "It can't go below level 3.",
          resolve: deDigivolveOneOpponent,
        }),
      ];
    }

    // [When Digivolving] ALL opponent Digimon (battle area only) with level <= 4
    // can't digivolve until end of their turn.
    // KB Q3853-Q3855: breeding area Digimon are excluded.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-restrict-digivolve`,
          description:
            "[When Digivolving] All of your opponent's Digimon with level 4 or lower " +
            "in the battle area can't digivolve until the end of their turn.",
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            for (const p of ctx.game.player(opponentSeat).battleArea) {
              if (p.inBreeding) continue;
              if (p.topCard === undefined) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (!isDigimon(def)) continue;
              if (def.level === undefined || def.level > 4) continue;
              ctx.fx.restrict(p.permanentId, "digivolve", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/leave-play-rock-earth-play`,
          description:
            "[All Turns][Once Per Turn] When this Digimon would leave the battle area " +
            "other than by one of your effects, you may play 1 Rock Dragon/Earth Dragon " +
            "Digimon from your trash without paying the cost.",
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "instead",
              oncePerTurnKey: `${cardId}/leave-play-rock-earth-play`,
              description: `${cardId}: play a Rock Dragon/Earth Dragon Digimon from trash`,
              causeAllows: (cause, resolvingSeat) => cause !== "byEffect" || resolvingSeat !== source.ownerSeat,
              appliesTo: (_subCtx, leavingPermanentId) => leavingPermanentId === self.permanentId,
              apply: async (subCtx) => {
                const candidates = subCtx.game.player(source.ownerSeat).trash.filter((card) => {
                  const def = subCtx.game.definitionOf(card);
                  return isDigimon(def) && (def.types ?? []).some((type) => type === "Rock Dragon" || type === "Earth Dragon");
                });
                if (candidates.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((card) => card.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) await subCtx.fx.playInstances(chosen, { payCost: false });
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
