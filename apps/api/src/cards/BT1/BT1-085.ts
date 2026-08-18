import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-085";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/memory-setter`,
          description: "[Start of Your Turn] If you have 2 or less memory, set it to 3.",
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
          effectKey: `${cardId}/red-security-attack`,
          description: "[Your Turn] Your red Digimon with 4 or more sources gain Security Attack +1.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            for (const permanent of ctx.game.player(source.ownerSeat).battleArea) {
              if (
                permanent.topCard === undefined ||
                !isDigimon(ctx.game.definitionOf(permanent.topCard)) ||
                permanent.stack.length < 4 ||
                !ctx.game.effectiveColors?.(permanent).includes(CardColor.Red)
              )
                continue;
              ctx.fx.grantKeyword(
                permanent.permanentId,
                "SecurityAttack",
                EffectDuration.Permanent,
                1,
                { continuous: true },
              );
            }
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying the cost.",
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
