import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-220";

function hasCompositeOrWickedOrDM(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Composite" || t === "Wicked God" || t === "DM");
}

function hasCompositeOrVer(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Composite" || t === "Ver.3" || t === "Ver.5");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/reboot`,
          description: "＜Reboot＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Reboot", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "[On Play] <De-Digivolve 2> 1 of your opponent's Digimon. Then, you may delete " + "1 Digimon.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const targets = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.deDigivolve(chosen[0]!, 2);
              }
            }
            const allDigimon = Array.from(opp.battleArea)
              .concat(Array.from(ctx.game.player(source.ownerSeat).battleArea))
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (allDigimon.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: allDigimon, min: 0, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent(chosen, "byEffect");
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
            "[When Digivolving] <De-Digivolve 2> 1 of your opponent's Digimon. Then, you may " + "delete 1 Digimon.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const targets = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
              if (chosen.length > 0) {
                ctx.fx.deDigivolve(chosen[0]!, 2);
              }
            }
            const allDigimon = Array.from(opp.battleArea)
              .concat(Array.from(ctx.game.player(source.ownerSeat).battleArea))
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (allDigimon.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: allDigimon, min: 0, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.deletePermanent(chosen, "byEffect");
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion`,
          description:
            "[On Deletion] By returning 3 [Composite]/[Wicked God]/[DM] cards from your trash " +
            "to the bottom of the deck, you may play 2 level 6 or lower [Composite]/[Ver.3]/[Ver.5] " +
            "trait Digimon from your trash without paying the cost.",
          optional: true,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const costCards = Array.from(owner.trash).filter((c) => hasCompositeOrWickedOrDM(ctx.game.definitionOf(c)));
            if (costCards.length < 3) return;
            const returnTargets = await ctx.ask.selectCards(ctx, {
              candidates: costCards.map((c) => c.instanceId),
              min: 3,
              max: 3,
            });
            if (returnTargets.length < 3) return;
            await ctx.fx.returnToDeck(returnTargets, { toTop: false });
            const playables = Array.from(owner.trash).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && (def.level ?? 99) <= 6 && hasCompositeOrVer(def);
            });
            if (playables.length > 0) {
              const first = await ctx.ask.selectCards(ctx, {
                candidates: playables.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (first.length === 0) return;
              const firstLevel = ctx.game.definitionOf(playables.find((c) => c.instanceId === first[0])!).level;
              const secondCandidates = playables.filter((c) => {
                const level = ctx.game.definitionOf(c).level;
                return c.instanceId !== first[0] && level !== firstLevel;
              });
              const second =
                secondCandidates.length > 0
                  ? await ctx.ask.selectCards(ctx, {
                      candidates: secondCandidates.map((c) => c.instanceId),
                      min: 0,
                      max: 1,
                    })
                  : [];
              await ctx.fx.playInstances([...first, ...second], { payCost: false });
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
