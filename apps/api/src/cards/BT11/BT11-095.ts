import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-095";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main`,
          optional: true,
          description: "Place an Xros Heart/Blue Flare Digimon under this Tamer to gain 1 memory and draw 1.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const candidates = ctx.game
              .player(source.ownerSeat)
              .hand.filter((card) => {
                const def = ctx.game.definitionOf(card);
                return (
                  isDigimon(def) &&
                  def.types?.some((trait) => trait === "Xros Heart" || trait === "Blue Flare") === true
                );
              })
              .map(({ instanceId }) => instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;
            await ctx.fx.placeUnder(self.permanentId, chosen);
            ctx.fx.gainMemory(1);
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/xros-from-tamers`,
          description: "While unsuspended, DigiXros may use cards under your Tamers.",
          when: () => source.isOwnersTurn() && source.permanent()?.isSuspended === false,
          resolve: async (ctx) => {
            ctx.fx.expandDigiXrosZones?.(source.ownerSeat, ["digivolutionCards"], EffectDuration.Permanent);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "Play this card without paying its cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
