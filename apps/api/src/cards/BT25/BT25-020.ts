import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, onPlay, whenAttacking, staticModifier, digivolveCostStatic } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT25-020 — Red Lv.6 Digimon (BT25, Marsmon).
//
// Digivolve: 3 from Level 5 with [TS] trait
// When you would play this card from your hand, if there is a Digimon with 13000 DP or
//   more in play, reduce the play cost by 5.
// [On Play] [When Digivolving] [When Attacking] 1 of your Digimon gets +3000 DP for the
//   turn. Then, 1 of your Digimon may battle 1 of your opponent's Digimon.
// [All Turns] [Once Per Turn] When any of your [TS] trait Digimon win a battle, trash
//   your opponent's top security card.

const cardId = "BT25-020";

function sharedDpBattle(
  ctx: EffectContext,
  source: CardSource,
): Promise<void> {
  return (async () => {
    const owner = ctx.game.player(source.ownerSeat);
    const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));

    const yourDigimons = Array.from(owner.battleArea).filter((p) => {
      return p.topCard != null && isDigimon(ctx.game.definitionOf(p.topCard));
    });

    if (yourDigimons.length === 0) return;

    // Select 1 your Digimon to get +3000 DP
    const dpChosen = await ctx.ask.chooseTargets(ctx, {
      candidates: yourDigimons.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (dpChosen.length === 0) return;
    ctx.fx.modifyDP(dpChosen[0]!, 3000, EffectDuration.UntilEachTurnEnd);

    // Select 1 your Digimon to battle (optional)
    const atkChosen = await ctx.ask.chooseTargets(ctx, {
      candidates: yourDigimons.map((p) => p.permanentId),
      min: 0,
      max: 1,
    });
    if (atkChosen.length === 0) return;

    const oppDigimons = Array.from(opponent.battleArea).filter((p) => {
      return p.topCard != null && isDigimon(ctx.game.definitionOf(p.topCard));
    });
    if (oppDigimons.length === 0) return;

    const defChosen = await ctx.ask.chooseTargets(ctx, {
      candidates: oppDigimons.map((p) => p.permanentId),
      min: 0,
      max: 1,
    });
    if (defChosen.length === 0) return;

    await ctx.fx.forceBattle?.(atkChosen[0]!, defChosen[0]!);
  })();
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] 1 of your Digimon gets +3000 DP for the turn. Then, 1 of your Digimon " +
            "may battle 1 of your opponent's Digimon.",
          resolve: async (ctx) => {
            await sharedDpBattle(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] 1 of your Digimon gets +3000 DP for the turn. Then, 1 of your " +
            "Digimon may battle 1 of your opponent's Digimon.",
          resolve: async (ctx) => {
            await sharedDpBattle(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking`,
          description:
            "[When Attacking] 1 of your Digimon gets +3000 DP for the turn. Then, 1 of your " +
            "Digimon may battle 1 of your opponent's Digimon.",
          resolve: async (ctx) => {
            await sharedDpBattle(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/play-cost-reduction`,
          description: "When this card would be played, reduce its cost by 5 if a Digimon has 13000 DP or more.",
          when: (ctx) => ctx.game.player(ctx.source.ownerSeat).hand.some((card) => card.instanceId === ctx.source.instanceId),
          resolve: async (ctx) => {
            const hasLargeDigimon = ctx.game.state.players.some((player) =>
              player.battleArea.some((permanent) => {
                if (permanent.topCard === undefined) return false;
                const definition = ctx.game.definitionOf(permanent.topCard);
                return isDigimon(definition) && (permanent.currentDP ?? permanent.baseDP ?? 0) >= 13000;
              }),
            );
            if (!hasLargeDigimon) return;
            ctx.fx.changePlayCost(
              (facts) => facts.controllerSeat === ctx.source.ownerSeat && facts.def.cardId === cardId,
              -5,
            );
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/ts-battle-won-trash-security`,
          description: "[All Turns][Once Per Turn] When your TS Digimon wins a battle, trash your opponent's top security card.",
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenBattleWon",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: TS Digimon wins a battle`,
              matches: (subCtx) => {
                const winnerId = subCtx.trigger?.subjectPermanentId;
                if (winnerId === undefined) return false;
                const winner = subCtx.game.permanentById(winnerId);
                if (winner === undefined || winner.controllerSeat !== source.ownerSeat || winner.topCard === undefined) return false;
                return (subCtx.game.definitionOf(winner.topCard).types ?? []).includes("TS");
              },
              run: async (subCtx) => {
                await subCtx.fx.trashFromSecurity(subCtx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
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
