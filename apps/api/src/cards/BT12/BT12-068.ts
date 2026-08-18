import { CardColor, EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-068";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/raid`,
        description: "＜Raid＞",
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self) ctx.fx.grantKeyword(self.permanentId, "Raid", EffectDuration.Permanent);
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/play-tamer-on-switch`,
        description:
          "[All Turns][Once Per Turn] If an attack target is switched, you may play a black or red Tamer costing 4 or less from hand.",
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (!host) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenAttackTargetSwitched",
            sourcePermanentId: host.permanentId,
            once: false,
            description: `${cardId}: attack target switched`,
            run: async (subCtx) => {
              const candidates = subCtx.game
                .player(source.ownerSeat)
                .hand.filter((card) => {
                  const def = subCtx.game.definitionOf(card);
                  return (
                    isTamer(def) &&
                    def.playCost <= 4 &&
                    (def.colors.includes(CardColor.Black) || def.colors.includes(CardColor.Red))
                  );
                })
                .map(({ instanceId }) => instanceId);
              if (!candidates.length) return;
              const [picked] = await subCtx.ask.selectCards(subCtx, { candidates, min: 0, max: 1 });
              if (picked) await subCtx.fx.playInstances([picked], { payCost: false });
            },
          });
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-piercing`,
        description: "[Your Turn] While this Digimon has Greymon or Omnimon in its name, it gains Piercing.",
        isInherited: true,
        when: (ctx) => {
          const host = source.permanent();
          return (
            source.isOwnersTurn() &&
            host?.topCard !== undefined &&
            matchNameOrTrait(ctx.game.definitionOf(host.topCard), { tokens: ["Greymon", "Omnimon"], match: "name" })
          );
        },
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host) ctx.fx.grantKeyword(host.permanentId, "Piercing", EffectDuration.Permanent);
        },
      }),
    ];
  },
};
registerCard(module);
export default module;
