import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { whenDigivolving } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT12-065";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.WhenDigivolving) return [];
    return [
      whenDigivolving({
        source,
        effectKey: `${cardId}/grant-forced-attack`,
        description:
          "Give an opposing Digimon '[Start of Your Main Phase] Attack with this Digimon' until its turn ends.",
        resolve: async (ctx) => {
          const opponent = ctx.game.opponentOf(source.ownerSeat);
          const candidates = ctx.game
            .player(opponent)
            .battleArea.filter(
              (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
            )
            .map(({ permanentId }) => permanentId);
          if (!candidates.length) return;
          const [targetId] = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
          if (!targetId) return;
          ctx.fx.subscribeSubTrigger({
            event: "startOfYourMainPhase",
            sourcePermanentId: targetId,
            once: false,
            expiresOnTurnEndOf: opponent,
            description: `${cardId}: granted forced attack`,
            matches: (subCtx) => subCtx.game.state.turnSeat === opponent && subCtx.source.isOnBattleArea(),
            run: async (subCtx) => {
              await subCtx.fx.forceAttack(targetId);
            },
          });
        },
      }),
    ];
  },
};
const registered = registerIrCard(cardId, { effects: [], coverage: "full", residual: [] });
registered.effectsForTiming = module.effectsForTiming;
export default registered;
