import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "LM-017";

function hasGammamonInText(def: CardDefinition): boolean {
  return def.nameEn.includes("Gammamon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] Trash 1 card in your hand. Then, you may place 1 card with [Gammamon] " +
            "in its text from your trash under any of your Tamers.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.hand.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: Array.from(owner.hand).map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                ctx.fx.trash(chosen);
              }
            }
            const gammas = Array.from(owner.trash).filter((c) => {
              return hasGammamonInText(ctx.game.definitionOf(c));
            });
            if (gammas.length > 0) {
              const tamers = Array.from(owner.battleArea).filter(
                (p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard)),
              );
              if (tamers.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: gammas.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  const tamer = await ctx.ask.chooseTargets(ctx, {
                    candidates: tamers.map((t) => t.permanentId),
                    min: 1,
                    max: 1,
                  });
                  if (tamer.length > 0) {
                    await ctx.fx.placeUnder(tamer[0]!, chosen);
                  }
                }
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Trash 1 card in your hand. Then, you may place 1 card with " +
            "[Gammamon] in its text from your trash under any of your Tamers.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.hand.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: Array.from(owner.hand).map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                ctx.fx.trash(chosen);
              }
            }
            const gammas = Array.from(owner.trash).filter((c) => {
              return hasGammamonInText(ctx.game.definitionOf(c));
            });
            if (gammas.length > 0) {
              const tamers = Array.from(owner.battleArea).filter(
                (p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard)),
              );
              if (tamers.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: gammas.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length > 0) {
                  const tamer = await ctx.ask.chooseTargets(ctx, {
                    candidates: tamers.map((t) => t.permanentId),
                    min: 1,
                    max: 1,
                  });
                  if (tamer.length > 0) {
                    await ctx.fx.placeUnder(tamer[0]!, chosen);
                  }
                }
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/digivolution-trigger`,
          description:
            "[All Turns] [Once Per Turn] When an effect adds digivolution cards under this Digimon, " +
            "by deleting 1 level 4 or lower Digimon you have in play, you may play 1 level 4 or " +
            "lower Digimon from your trash without paying the cost.",
          maxPerTurn: 1,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              description: `${cardId}: When digivolution cards added, delete lv4- to play lv4- from trash.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                return true;
              },
              run: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return;
                const owner = subCtx.game.player(ownerSeat);
                const sacrificeTargets = Array.from(owner.battleArea)
                  .filter((p) => {
                    if (p.topCard === undefined) return false;
                    const def = subCtx.game.definitionOf(p.topCard);
                    return isDigimon(def) && (def.level ?? 99) <= 4;
                  })
                  .map((p) => p.permanentId);
                if (sacrificeTargets.length === 0) return;
                const trashTargets = Array.from(owner.trash)
                  .filter((c) => {
                    const def = subCtx.game.definitionOf(c);
                    return isDigimon(def) && (def.level ?? 99) <= 4;
                  })
                  .map((c) => c.instanceId);
                if (trashTargets.length === 0) return;
                const sacrifice = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: sacrificeTargets,
                  min: 1,
                  max: 1,
                });
                if (sacrifice.length === 0) return;
                await subCtx.fx.deletePermanent(sacrifice, "byEffect");
                const toPlay = await subCtx.ask.selectCards(subCtx, {
                  candidates: trashTargets,
                  min: 0,
                  max: 1,
                });
                if (toPlay.length > 0) {
                  await subCtx.fx.playInstances(toPlay, { payCost: false });
                }
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
