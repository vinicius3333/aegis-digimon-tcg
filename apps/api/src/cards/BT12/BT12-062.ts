import { EffectDuration, EffectTiming, isTamer } from "@aegis/shared";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-062";

function named(ctx: EffectContext, instanceId: string, token: string): boolean {
  const card = ctx.game.player(ctx.source.ownerSeat).hand.find((candidate) => candidate.instanceId === instanceId);
  return card !== undefined && matchNameOrTrait(ctx.game.definitionOf(card), { tokens: [token], match: "name" });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source) {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/play-tai`,
          description: "[When Digivolving] If you have no Tai Kamiya Tamer, you may play one from hand without cost.",
          optional: true,
          canActivate: (ctx) =>
            !ctx.game
              .player(source.ownerSeat)
              .battleArea.some(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isTamer(ctx.game.definitionOf(permanent.topCard)) &&
                  matchNameOrTrait(ctx.game.definitionOf(permanent.topCard), { tokens: ["Tai Kamiya"], match: "name" }),
              ),
          resolve: async (ctx) => {
            const candidates = ctx.game
              .player(source.ownerSeat)
              .hand.map(({ instanceId }) => instanceId)
              .filter((id) => named(ctx, id, "Tai Kamiya"));
            if (!candidates.length) return;
            const [picked] = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
            if (picked) await ctx.fx.playInstances([picked], { payCost: false });
          },
        }),
      ];
    }
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-dp`,
          description: "[All Turns] While this Digimon has Greymon or Omnimon in its name, it gets +1000 DP.",
          isInherited: true,
          when: (ctx) => {
            const host = source.permanent();
            return (
              host?.topCard !== undefined &&
              matchNameOrTrait(ctx.game.definitionOf(host.topCard), { tokens: ["Greymon", "Omnimon"], match: "name" })
            );
          },
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host) ctx.fx.modifyDP(host.permanentId, 1000, EffectDuration.Permanent);
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
