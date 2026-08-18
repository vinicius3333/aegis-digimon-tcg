import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-069";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/protection-delete`,
          description:
            "[When Digivolving] Gain opponent DP-reduction and De-Digivolve immunity; with MetalGreymon/X Antibody source delete an opposing 6000-DP-or-less Digimon.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.restrict(self.permanentId, "dpImmune", EffectDuration.UntilOpponentTurnEnd, {
              byOpponentEffectsOnly: true,
            });
            ctx.fx.restrict(self.permanentId, "cantBeDeDigivolved", EffectDuration.UntilOpponentTurnEnd);
            const qualifies = self.stack.some((card) =>
              ["MetalGreymon", "X Antibody"].some((name) => ctx.game.definitionOf(card).nameEn.includes(name)),
            );
            if (!qualifies) return;
            const candidates = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter(
                (permanent) =>
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
                  permanent.currentDP <= 6000,
              )
              .map(({ permanentId }) => permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 1) await ctx.fx.deletePermanent(chosen, "byEffect");
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-security-trash-on-unsuspend`,
        description:
          "Inherited [Opponent's Turn][Once Per Turn] When a Digimon unsuspends, if host is Greymon/Omnimon, trash opponent top security.",
        isInherited: true,
        maxPerTurn: 1,
        when: () => !source.isOwnersTurn(),
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenUnsuspended",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/${cardId}/security`,
            description: "BT11-069 inherited security trash",
            matches: (subCtx) => {
              const current = subCtx.game.permanentById(host.permanentId);
              return (
                !source.isOwnersTurn() &&
                current?.topCard !== undefined &&
                ["Greymon", "Omnimon"].some((name) => subCtx.game.definitionOf(current.topCard!).nameEn.includes(name))
              );
            },
            run: async (subCtx) => {
              await subCtx.fx.trashFromSecurity(subCtx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
