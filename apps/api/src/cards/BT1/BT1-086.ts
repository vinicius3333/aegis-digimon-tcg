import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-086";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/memory`,
          description: "[Start of Your Turn] Set memory to 3 if it is 2 or less.",
          when: (ctx) => source.isOwnersTurn() && ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blue-play`,
          description:
            "[Your Turn] When you play a blue Digimon, you may suspend this Tamer to trash an opposing bottom source.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: blue Digimon played`,
              matches: (subCtx) => {
                const id = subCtx.trigger.subjectPermanentId;
                const p = id ? subCtx.game.permanentById(id) : undefined;
                return (
                  source.isOwnersTurn() &&
                  !self.isSuspended &&
                  p?.topCard !== undefined &&
                  p.controllerSeat === source.ownerSeat &&
                  isDigimon(subCtx.game.definitionOf(p.topCard)) &&
                  subCtx.game.definitionOf(p.topCard).colors.includes(CardColor.Blue)
                );
              },
              run: async (subCtx) => {
                if (!(await subCtx.ask.optional(subCtx, "Suspend this Tamer to trash an opposing bottom source?")))
                  return;
                if (!subCtx.fx.payActivationCost?.(self.permanentId, "suspend")) return;
                const candidates = subCtx.game
                  .player(subCtx.game.opponentOf(source.ownerSeat))
                  .battleArea.filter(
                    (p) =>
                      p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)) && p.stack.length > 0,
                  )
                  .map((p) => p.permanentId);
                if (!candidates.length) return;
                const chosen = await subCtx.ask.chooseTargets(subCtx, { candidates, min: 1, max: 1 });
                const target = chosen[0] ? subCtx.game.permanentById(chosen[0]) : undefined;
                if (target?.stack[0])
                  await subCtx.fx.trashDigivolutionCards(target.permanentId, [target.stack[0].instanceId], {
                    byEffectSeat: source.ownerSeat,
                  });
              },
            });
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying its cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
