import { EffectTiming, isDigimon } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-076";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseAttack)
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/delete-for-delete`,
          description:
            "[When Attacking] Delete another own Digimon to delete an opposing unsuspended Digimon of no greater level.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const own = ctx.game
              .player(source.ownerSeat)
              .battleArea.filter(
                (permanent) =>
                  permanent.permanentId !== self.permanentId &&
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)),
              );
            if (own.length === 0) return;
            const sacrifice = await ctx.ask.chooseTargets(ctx, {
              candidates: own.map(({ permanentId }) => permanentId),
              min: 0,
              max: 1,
            });
            const sacrificed = sacrifice[0] === undefined ? undefined : ctx.game.permanentById(sacrifice[0]);
            if (sacrificed?.topCard === undefined) return;
            const level = ctx.game.definitionOf(sacrificed.topCard).level;
            if (level === undefined || (await ctx.fx.deletePermanent([sacrificed.permanentId], "byEffect")) !== 1)
              return;
            const opposing = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter(
                (permanent) =>
                  !permanent.isSuspended &&
                  permanent.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
                  (ctx.game.definitionOf(permanent.topCard).level ?? 99) <= level,
              )
              .map(({ permanentId }) => permanentId);
            if (opposing.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: opposing, min: 1, max: 1 });
            if (chosen.length === 1) await ctx.fx.deletePermanent(chosen, "byEffect");
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-memory-on-effect-play`,
        description: "Inherited [All Turns][Once Per Turn] When you play a Digimon by an effect, gain 1 memory.",
        isInherited: true,
        maxPerTurn: 1,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenPlayed",
            sourcePermanentId: host.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/${cardId}/memory`,
            description: "BT11-076 inherited memory",
            matches: (subCtx) =>
              subCtx.trigger.playedByEffect === true &&
              (() => {
                const id = subCtx.trigger.subjectPermanentId;
                return id !== undefined && subCtx.game.permanentById(id)?.controllerSeat === source.ownerSeat;
              })(),
            run: async (subCtx) => {
              subCtx.fx.gainMemory(1);
            },
          });
        },
      }),
    ];
  },
};
registerCard(module);
