import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-089";
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
    if (timing === EffectTiming.OnDeclaration)
      return [
        activated({
          source,
          effectKey: `${cardId}/breeding`,
          description: "[Main] Suspend this Tamer to hatch or move a level 3+ Digimon from breeding.",
          optional: true,
          canActivate: (ctx) =>
            source.permanent()?.isSuspended === false &&
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (p) =>
                  p.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(p.topCard)) &&
                  (ctx.game.definitionOf(p.topCard).level ?? 0) >= 5 &&
                  ctx.game.definitionOf(p.topCard).colors.includes(CardColor.Green),
              ),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self || !ctx.fx.payActivationCost?.(self.permanentId, "suspend")) return;
            const player = ctx.game.player(source.ownerSeat);
            const canHatch = player.breeding === undefined && player.eggDeck.length > 0;
            const canMove =
              player.breeding?.topCard !== undefined &&
              (ctx.game.definitionOf(player.breeding.topCard).level ?? 0) >= 3;
            const choices: string[] = [];
            if (canHatch) choices.push("Hatch");
            if (canMove) choices.push("Move from breeding");
            if (!choices.length) return;
            const choice = choices.length === 1 ? 0 : await ctx.ask.chooseOption(ctx, choices);
            if (choices[choice] === "Hatch") ctx.fx.hatch(source.ownerSeat);
            else if (player.breeding) await ctx.fx.movePermanentZone(player.breeding.permanentId, "toBattle");
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
