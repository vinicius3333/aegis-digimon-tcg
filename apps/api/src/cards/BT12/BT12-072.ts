import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-072";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.OnStartMainPhase)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/place-cyborg-machine`,
          description:
            "Place a Cyborg or Machine Digimon from trash under this Digimon as its bottom digivolution card.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            const candidates = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) => {
                const def = ctx.game.definitionOf(card);
                return isDigimon(def) && (def.types?.includes("Cyborg") || def.types?.includes("Machine"));
              })
              .map(({ instanceId }) => instanceId);
            if (!candidates.length) return;
            const [picked] = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
            if (picked) await ctx.fx.placeUnder(self.permanentId, [picked]);
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/gain-stack-effects`,
          description: "Gain all effects of Machinedramon and Chaosdramon cards in this Digimon's digivolution cards.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            for (const card of self.stack)
              if (
                matchNameOrTrait(ctx.game.definitionOf(card), {
                  tokens: ["Machinedramon", "Chaosdramon"],
                  match: "name",
                })
              )
                ctx.fx.conferStackEffects(self.permanentId, card.instanceId, EffectDuration.Permanent);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/trash-security-before-deletion`,
          description: "[All Turns][Once Per Turn] If this Digimon would be deleted, trash the top opposing security.",
          maxPerTurn: 1,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.subscribeReplacement({
              event: "wouldBeDeleted",
              sourcePermanentId: self.permanentId,
              mode: "instead",
              oncePerTurnKey: `${cardId}/trash-security-before-deletion/${self.permanentId}`,
              description: "Trash the top opposing security before this Digimon is deleted.",
              appliesTo: (_subCtx, leavingId) => leavingId === self.permanentId,
              apply: async (subCtx) => {
                await subCtx.fx.trashFromSecurity(subCtx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
              },
            });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
